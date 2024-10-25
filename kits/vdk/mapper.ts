import type {z} from '@opensdks/util-zod'
import * as R from 'remeda'
import type {PathsOf} from './type-utils/PathsOf'
import type {StrictObjDeep} from './type-utils/StrictObj'

export const literal = <T>(literal: T) => ({literal})

// type abc = PathsOf<
//   StrictObjDeep<
//     Required<{
//       Contact?: {
//         ContactId: string
//         Account?: {
//           accountId?: string
//         }
//       }
//     }>
//   >
// >

export function mapper<
  ZInputSchema extends z.ZodTypeAny,
  ZOutputSchema extends z.ZodTypeAny,
  TOut extends z.infer<ZOutputSchema> = z.infer<ZOutputSchema>,
  TIn extends z.infer<ZInputSchema> = z.infer<ZInputSchema>,
>(
  zInput: ZInputSchema,
  zOutput: ZOutputSchema,
  mapping:
    | {
        [k in keyof TOut]:  // | ExtractKeyOfValueType<TIn, TOut[k]> // | Getter<ExtractKeyOfValueType<TIn, TOut[k]>> // | TOut[k] // Constant
          | PathsOf<StrictObjDeep<Required<TIn>>> // Getter for the keypaths
          // A bit of a hack as PathsOf<StrictObjDeep> does not work with optional props...
          | ReturnType<typeof literal<TOut[k]>> // literal value
          | ((ext: TIn) => TOut[k]) // Function that can do whatever on a property level
      }
    | ((ext: TIn) => TOut), // Function that can do whatever,
) {
  const meta = {
    _in: undefined as TIn,
    _out: undefined as TOut,
    inputSchema: zInput,
    outputSchema: zOutput,
    mapping,
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  const apply = (input: TIn): TOut => applyMapper(meta, input)
  apply._in = undefined as TIn
  apply._out = undefined as TOut
  apply.inputSchema = zInput
  apply.outputSchema = zOutput
  apply.mapping = mapping
  /** Parse, don't validate! */
  apply.parse = (input: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const validInput = zInput.parse(input)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const output = apply(validInput)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const validOutput = zOutput.parse(output)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return validOutput as TOut
  }
  return apply
}

// TODO: We need a reverse mapper that does not add raw_data
// to the output...

export function applyMapper<
  T extends Pick<
    ReturnType<typeof mapper>,
    'mapping' | '_in' | '_out' | 'inputSchema' | 'outputSchema'
  >,
>(mapper: T, input: T['_in']): T['_out'] {
  if (typeof mapper.mapping === 'function') {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return mapper.mapping(input)
  }
  // This can probably be extracted into its own function without needint TIn and TOut even
  const output = R.mapValues(mapper.mapping, (m, key) => {
    if (typeof m === 'function') {
      return m(input) as unknown
    } else if (typeof m === 'object' && 'literal' in m) {
      return m.literal as unknown
    } else if (typeof m === 'string') {
      return getValueAtKeyPath(input, m)
    }
    throw new Error(`Invalid mapping ${m as unknown} at ${key.toString()}`)
  })
  // TODO: Does this belong here?
  Object.assign(output, {raw_data: input})
  return output
}

/**
 * https://dev.to/pffigueiredo/typescript-utility-keyof-nested-object-2pa3
 * We could probbaly use R.pathOr... but it is too well-typed for our needs 🤣
 */
function getValueAtKeyPath(object: unknown, path: string) {
  const keys = path.split('.')
  let result = object
  for (const key of keys) {
    if (result == null) {
      return result
    }
    if (typeof result !== 'object') {
      console.error(
        `Cannot get value at keypath ${path} from non-object`,
        object,
      )
      // TODO: Make object log properly
      throw new TypeError(`Cannot get value at keypath ${path} from non-object`)
    }
    result = (result as Record<string, unknown>)[key]
  }
  return result
}
