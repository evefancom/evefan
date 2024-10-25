import type admin from 'firebase-admin'
import type firebase from 'firebase/compat'
import type {InjectionToken} from '@openint/util'
import {objectKeys, resolveDependency, rxjs} from '@openint/util'
import type {
  AnyDocumentReference,
  AnyDocumentSnapshot,
  AnyFieldPathClass,
  AnyFieldValueClass,
  AnyFirestore,
  AnyQuery,
  AnyQuerySnapshot,
  AnyTimestamp,
  AnyTimestampClass,
  Doc,
  DocIdOf,
  GetOptions,
  RawOf,
  SerializedTimestamp,
  SnapshotData,
  Timestamp,
} from './firebase-types'

/** @deprecated. to be removed */
export const kFieldPath = Symbol(
  'FieldPath',
) as InjectionToken<AnyFieldPathClass>
export const kFieldValue = Symbol(
  'FieldValue',
) as InjectionToken<AnyFieldValueClass>
export const kTimestamp = Symbol(
  'Timestamp',
) as InjectionToken<AnyTimestampClass>

export const fieldPath = (...fieldNames: string[]) => {
  const FieldPath = resolveDependency(kFieldPath)
  return new FieldPath(...fieldNames)
}
export const fieldValue = () => resolveDependency(kFieldValue)
export const fieldDelete = () => fieldValue().delete() as never
export const fieldArrayUnion = <T>(val: T) =>
  fieldValue().arrayUnion(val) as unknown as T[]
export const fieldArrayRemove = <T>(val: T) =>
  fieldValue().arrayRemove(val) as unknown as T[]

export const timestamp = () => resolveDependency(kTimestamp)
export const currentTimestamp = () => resolveDependency(kTimestamp).now()
// Start using  serverTimestamp() later once we have a dependency
// on the serverTimestamp() being accurate
// fieldValue().serverTimestamp() as AnyTimestamp

export function nullAsDelete<T>(input: T): Exclude<T, null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
  return input === null ? fieldDelete() : (input as any)
}

export function emptyAsDelete<T extends string | null | undefined>(
  input: T,
): Exclude<T, null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
  return input === null || input?.trim() === '' ? fieldDelete() : (input as any)
}

export function isTimestamp(value: unknown): value is SerializedTimestamp {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>)['seconds'] === 'number' &&
    typeof (value as Record<string, unknown>)['nanoseconds'] === 'number'
  )
}

export function timestampToDate(ts: SerializedTimestamp) {
  if ('toDate' in ts) {
    return ts.toDate()
  }
  return timestamp().fromMillis(timestampToMillis(ts)).toDate()
}

export function timestampToMillis(ts: SerializedTimestamp) {
  if ('toMillis' in ts) {
    return ts.toMillis()
  }
  return ts.seconds * 1e3 + ts.nanoseconds / 1e6
}

export function serializeTimestamp(ts: AnyTimestamp): SerializedTimestamp {
  return {
    seconds: ts.seconds,
    nanoseconds: ts.nanoseconds,
  }
}

export async function getDocumentDataOrFail<T>(
  doc: AnyDocumentReference<T>,
  options?: GetOptions,
) {
  const data = await getDocumentData(doc, options)
  if (!data) {
    throw new Error(`Document not found: ${doc.path}`)
  }
  return data
}

export async function getDocumentData<T>(
  doc: AnyDocumentReference<T>,
  options?: GetOptions,
) {
  try {
    const snap = await doc.get(options)
    return unwrapDocumentSnapshot(snap)
  } catch (err) {
    console.error('Failed to get document data', doc.path, err)
    throw err
  }
}

export async function getQueryData<T>(
  query: AnyQuery<T>,
  options?: GetOptions,
) {
  try {
    const querySnap = await query.get(options)
    const docSnaps = querySnap.docs as Array<AnyDocumentSnapshot<T>>
    return docSnaps
      .filter((snap) => snap.exists)
      .map((snap) => unwrapDocumentSnapshot(snap))
      .filter((data): data is NonNullable<typeof data> => !!data)
  } catch (err) {
    console.error('Failed to get query data', query, err)
    throw err
  }
}

/** Rename to DocumentSnapshot */
export function getDocumentSnapshot$<T, TStore extends AnyFirestore>(
  ref: AnyDocumentReference<T, TStore> & {firestore: TStore},
  options: firebase.firestore.SnapshotListenOptions = {},
) {
  return new rxjs.Observable<AnyDocumentSnapshot<T, TStore>>((obs) =>
    'listCollections' in ref.firestore
      ? (ref as unknown as admin.firestore.DocumentReference<T>).onSnapshot(
          (snap) => obs.next(snap as AnyDocumentSnapshot<T, TStore>),
          (err) => obs.error(err),
        )
      : (ref as firebase.firestore.DocumentReference<T>).onSnapshot(options, {
          next: (snap) => obs.next(snap as AnyDocumentSnapshot<T, TStore>),
          error: (err) => obs.error(err),
        }),
  )
}

export function getQuerySnapshot$<T, TStore extends AnyFirestore>(
  query: AnyQuery<T, TStore> & {firestore: TStore},
  options: firebase.firestore.SnapshotListenOptions = {},
) {
  return new rxjs.Observable<AnyQuerySnapshot<T, TStore>>((obs) =>
    'listCollections' in query.firestore
      ? (query as unknown as admin.firestore.Query<T>).onSnapshot(
          (snap) => obs.next(snap as AnyQuerySnapshot<T, TStore>),
          (err) => obs.error(err),
        )
      : (query as firebase.firestore.Query<T>).onSnapshot(options, {
          next: (snap) => obs.next(snap as AnyQuerySnapshot<T, TStore>),
          error: (err) => obs.error(err),
        }),
  )
}

// Not in firebase-utils because stream() only works for adminFirestore
// and is not @universal
export function getQueryDocumentSnapshot$<T>(query: admin.firestore.Query<T>) {
  return new rxjs.Observable<admin.firestore.DocumentSnapshot<T>>(
    (subscriber) => {
      query
        .stream()
        .on('data', (snap: admin.firestore.DocumentSnapshot<T>) =>
          subscriber.next(snap),
        )
        .on('end', () => subscriber.complete())
        .on('error', (err) => subscriber.error(err))
    },
  )
}

/** Handles deletion tombstones */
export function unwrapDocumentSnapshot<T>(snap: AnyDocumentSnapshot<T>) {
  const data = snap.data() as SnapshotData<Doc>
  if (!data) {
    return null
  }
  if (data.deletedAt) {
    return null
  }
  return {
    ...data,
    ...idsForRef(snap.ref),
    id: data.id ?? snap.id,
    _id: snap.id,
    createdAt: data.createdAt ?? timestamp().fromMillis(0),
    updatedAt: data.updatedAt ?? timestamp().fromMillis(0),
  } as RawOf<T> & {
    id: DocIdOf<RawOf<T>>
    _id: DocIdOf<RawOf<T>>
    createdAt: Timestamp
    updatedAt: Timestamp
    deletedAt?: null
  }
}

export function idsForRef(ref: AnyDocumentReference) {
  // .parent = `/users/<LedgerId>/<collectionName>` or `/users/<UserId>/<collectionName>`
  // .parent.parent = `/users/<LedgerId>` or `/users/<UserId>`
  // .parent.parent.parent = `/users` or `/users`
  const ledgerOrUserRef = ref.parent.parent
  if (ledgerOrUserRef?.parent.id === 'users') {
    return {
      id: ref.id,
      userId: ledgerOrUserRef.id as DeprecatedUserId,
    }
  }
  if (ledgerOrUserRef?.parent.id === 'ledgers') {
    return {
      id: ref.id,
      ledgerId: ledgerOrUserRef.id as DeprecatedLedgerId,
    }
  }
  return {id: ref.id}
}

// HACK: This is super hacky but seems to be fairly reliable.
// What we're trying to access here is the `_delegate` field on the `Query`
// class (https://github.com/firebase/firebase-js-sdk/blob/375437171961fb369484990c528c6f4a7dd5cdef/packages/firestore/src/api/database.ts#L967).
// However, it's been obfuscated by Terser and thus we have no stable way to
// access it.
// The type we're returning here is `ResourcePath` (https://github.com/firebase/firebase-js-sdk/blob/375437171961fb369484990c528c6f4a7dd5cdef/packages/firestore/src/model/path.ts#L194)
export function getPathForQuery(query: AnyQuery) {
  for (const queryKey of objectKeys(query)) {
    const queryProp = (query as unknown as Record<string, unknown>)[queryKey]
    if (typeof queryProp === 'object' && queryProp && 'type' in queryProp) {
      const delegate = queryProp
      for (const delegateKey of objectKeys(delegate)) {
        const delegateProp = (delegate as Record<string, unknown>)[delegateKey]
        if (
          typeof delegateProp === 'object' &&
          delegateProp &&
          'path' in delegateProp
        ) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
          const pathObj = (delegateProp as any).path as {
            segments: string[]
            offset?: number
            length?: number
          }
          return pathObj.segments.join('/')
        }
      }
    }
  }
  throw new Error('Unable to extract path from query')
}

export function isSameTimestamp(
  a: Timestamp | null | undefined,
  b: Timestamp | null | undefined,
  {
    marginSeconds = 0,
  }: {
    marginSeconds?: number
  } = {},
) {
  if (a == null && b == null) {
    return true
  }
  if (a == null || b == null) {
    return false
  }
  return (
    b.seconds >= a.seconds - marginSeconds &&
    b.seconds <= a.seconds + marginSeconds
  )
}
