import type firebase from 'firebase/compat'
import type {NoInfer, ObjectPartialDeep, PathsOf} from '@openint/util'
import {deepOmitUndefined, getAt, operateForEach, R, rxjs} from '@openint/util'
import type {
  AnyDocumentReference,
  AnyFieldPath,
  AnyFirestore,
  AnyWriteBatch,
  Firestore,
  RawOf,
  SetOptions,
} from './firebase-types'
import {fieldPath} from './firebase-utils'
import type {WrappedFirebase} from './server'

type Instruction<TStore extends AnyFirestore = AnyFirestore> =
  | [
      'set',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [AnyDocumentReference<any, TStore>, object, SetOptions],
    ]
  | [
      'update',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [AnyDocumentReference<any, TStore>, object],
    ]
  | [
      'updateField',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [AnyDocumentReference<any, TStore>, string | AnyFieldPath, any],
    ]
  | [
      'delete',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [AnyDocumentReference<any, TStore>],
    ]

export class MultiBatch {
  instructions: Instruction[] = []

  // The suggested number is 500 -- however, it turns out that
  // `FieldValue.serverTimestamp()` counts as an extra write
  // https://stackoverflow.com/a/54688365
  // firebase/index.d.ts line # 7244 has more details
  // TODO: Allow user to configure this to be able to handle it faster based on
  // whether serverTimestamp is being used
  maxBatchSize = 500
  disabled = false

  constructor(
    private readonly opt: WrappedFirebase | AnyFirestore | undefined,
  ) {}

  get defaultFst() {
    return this.opt && 'fst' in this.opt ? this.opt.fst : this.opt
  }

  fieldPath(...path: string[]) {
    return this.opt && 'firestore' in this.opt
      ? new this.opt.firestore.FieldPath(...path)
      : fieldPath(...path)
  }

  private enqueue(instruction: Instruction) {
    // TODO: Only perform in development?
    const validate = false
    if (validate && this.defaultFst) {
      // https://cln.sh/L852fe This will firestore's internal validation methods
      // and thus help us vaildate synchronously at time of queuing rather than
      // time of committing
      console.debug(
        '[core/@firebase] MultiBatch#enqueue',
        instruction[0],
        instruction[1][0].path,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        ...instruction[1].slice(1),
      )
      this.getWriteBatchForChunk(this.defaultFst, [instruction])
    }
    this.instructions.push(instruction)
  }

  set<T extends object>(
    ref: AnyDocumentReference<T>,
    data: NoInfer<RawOf<T>>,
  ): void
  set<T extends object>(
    ref: AnyDocumentReference<T>,
    data: ObjectPartialDeep<NoInfer<RawOf<T>>>,
    options:
      | {
          merge: boolean
          mergeFields?: never
        }
      | {
          merge?: never
          mergeFields: Array<PathsOf<RawOf<T>> | string[]>
        },
  ): void
  set<T extends object>(
    ref: AnyDocumentReference<T>,
    data: RawOf<T> | ObjectPartialDeep<RawOf<T>>,
    options: {
      merge?: boolean
      mergeFields?: Array<PathsOf<RawOf<T>> | string[]>
    } = {},
  ) {
    const sanitizedData = deepOmitUndefined(data, {
      pruneEmptyObjectProperties: options.mergeFields == null || options.merge,
      pruneEmptyKey: true,
    })
    const sanitizedOptions = options.mergeFields
      ? {
          ...options,
          mergeFields: (options.mergeFields as string[][])
            .filter(
              (field) =>
                // Whether or not field got pruned
                getAt(sanitizedData, field) !== undefined,
            )
            .map((field) =>
              Array.isArray(field) ? this.fieldPath(...field) : field,
            ),
        }
      : (options as {merge?: boolean})
    // console.debug(
    //   `[core/@firebase] MultiBatch#set :: ${ref.path}`,
    //   sanitizedData,
    //   sanitizedOptions,
    // )
    this.enqueue(['set', [ref, sanitizedData, sanitizedOptions]])
  }

  setWithMerge<T extends object>(
    ref: AnyDocumentReference<T>,
    data: ObjectPartialDeep<NoInfer<RawOf<T>>>,
    options: {mergeFields?: Array<PathsOf<RawOf<T>> | string[]>} = {},
  ) {
    if (options.mergeFields) {
      this.set(ref, data, {mergeFields: options.mergeFields as string[][]})
    } else {
      this.set(ref, data, {merge: true})
    }
  }

  update<T extends object>(
    ref: AnyDocumentReference<T>,
    data: ObjectPartialDeep<NoInfer<RawOf<T>>>,
  ) {
    this.enqueue([
      'update',
      [
        ref,
        deepOmitUndefined(data, {
          pruneEmptyObjectProperties: true,
          pruneEmptyKey: true,
        }),
      ],
    ])
  }

  updateField<T extends object, U>(
    ref: AnyDocumentReference<T>,
    field: string | firebase.firestore.FieldPath,
    data: U,
  ) {
    this.enqueue([
      'updateField',
      [
        ref,
        field,
        typeof data === 'object'
          ? deepOmitUndefined(data, {
              pruneEmptyObjectProperties: true,
              pruneEmptyKey: true,
            })
          : data,
      ],
    ])
  }

  delete<T extends object>(ref: AnyDocumentReference<T>) {
    this.enqueue(['delete', [ref]])
  }

  reset() {
    this.instructions = []
  }

  async commit(_fst?: AnyFirestore): Promise<void> {
    if (this.disabled) {
      console.log('Returning due to batch disabled')
      return
    }
    const fst = _fst ?? this.defaultFst
    if (!fst) {
      throw new Error('[MultiBatch] missing fst')
    }
    if (this.instructions.length === 0) {
      // console.debug(
      //   '[core/@firebase] Skip committing batch with no instructions',
      // )
      return
    }

    const chunks = R.chunk(this.instructions, this.maxBatchSize)
    await operateForEach(
      rxjs.from(chunks),
      async (chunk) => {
        try {
          await this.getWriteBatchForChunk(fst, chunk).commit()
        } catch (err) {
          console.error('[core/@firebase] Failed to commit chunk', err, chunk)
          throw err
        }
      },
      {concurrency: 10},
    )
    this.reset()
  }

  private getWriteBatchForChunk(fst: AnyFirestore, _chunk: Instruction[]) {
    const batch = fst.batch() as AnyWriteBatch<Firestore>
    // HACK: Fixing type conflict between client vs cloud SDK
    const chunk = _chunk as Array<Instruction<Firestore>>
    for (const ins of chunk) {
      switch (ins[0]) {
        case 'set':
          batch.set(...ins[1])
          break
        case 'update':
          batch.update(...ins[1])
          break
        case 'updateField':
          batch.update(...ins[1])
          break
        case 'delete':
          batch.delete(...ins[1])
          break
      }
    }
    return batch
  }
}
