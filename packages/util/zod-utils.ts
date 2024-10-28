import * as R from 'remeda'
import * as z from 'zod'
import {extendZodWithOpenApi} from 'zod-openapi'

extendZodWithOpenApi(z)

export {z}

export function parseIf<T>(value: unknown, typeguard: (v: unknown) => v is T) {
  return typeguard(value) ? value : undefined
}

export function nonNullable<T>(value: T): value is NonNullable<T> {
  return value != null
}

export type JsonLiteral = z.infer<typeof zLiteral>
export const zLiteral = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  // z.undefined(), // Technicall not valid json..
])

export type Json = JsonLiteral | {[key: string]: Json} | Json[]
export const zJson: z.ZodType<Json> = z.lazy(() =>
  z.union([zLiteral, z.array(zJson), z.record(zJson)]),
)

export type JsonObject = z.infer<typeof zJsonObject>
export const zJsonObject = z.record(zJson)

export function zGuard<T, U>(fn: (input: T) => U | Promise<U>) {
  return (out: T, ctx: z.RefinementCtx) => {
    function catchError(err: unknown) {
      if (err instanceof z.ZodError) {
        err.issues.forEach((issue) => ctx.addIssue({...issue, fatal: true}))
      } else {
        ctx.addIssue({code: 'custom', fatal: true, message: `${err}`})
      }
      return err as U // Due to fatal, this will never be used
    }
    try {
      const ret = fn(out)
      return R.isPromise(ret) ? ret.catch(catchError) : ret
    } catch (err) {
      return catchError(err)
    }
  }
}

export function zGuardTransform<ZType extends z.ZodTypeAny, U>(
  fn: (input: z.output<ZType>) => U | Promise<U>,
) {
  return (zType: ZType) => zType.transform(zGuard(fn))
}

export function zRefineNonNull<TOut, ZType extends z.ZodType<TOut>>(
  zType: ZType,
) {
  return zType
    .superRefine((input) => !!input)
    .transform((input) => input as NonNullable<TOut>)
}

/**
 * e.g. `schema.transform(cast<TOut>())
 * Useful as a casting typeguard
 * HOC because prettier doesn't understand how to format... https://share.cleanshot.com/vfED5U
 * and it is also tricky in ts to declare
 *
 */
// prettier-ignore
export const cast = <T>() => (_input: unknown) => _input as T

// prettier-ignore
/** `schema.refine(castIs<TOut>)` */
export const castIs = <T>() =>(_input: unknown): _input is T => true

/** `zCast<TOut>()` standalone */
export const zCast = <T>(...args: Parameters<(typeof z)['unknown']>) =>
  z.unknown(...args) as z.ZodType<T, z.ZodTypeDef, unknown>

/** Alternative to zCast that only accepts Records as inputs */
export const zRecord = <T extends Record<string, unknown>>() =>
  z.record(z.unknown()) as z.ZodType<T, z.ZodTypeDef, Record<string, unknown>>

export const zObject = <T extends Record<string, unknown>>() =>
  z.object({}) as unknown as z.ZodType<T, z.ZodTypeDef, Record<string, unknown>>

/** `castInput(schema)<TInput>()` */
export const castInput =
  <T extends z.ZodTypeAny>(schema: T) =>
  <TInput extends T['_input']>() =>
    schema as z.ZodType<T['_output'], z.ZodTypeDef, TInput>

export function isZodType(input: unknown): input is z.ZodTypeAny {
  const obj = input as z.ZodTypeAny
  return typeof obj === 'object' && typeof obj._def === 'object'
}

/** Not secure because we could leak secrets to logs */
export function zodInsecureDebug() {
  z.setErrorMap((_issue, ctx) => {
    // Need to get the `schema` as well.. otherwise very hard to debug
    // which part is failing because we use Zod for almost everything...
    console.error('[zod] Data did not pass validation', {
      data: ctx.data as unknown,
      issue: _issue,
    })
    return {message: ctx.defaultError}
  })
}

// MARK: - Custom wrapper and error handling

/** Better ZodParser... @see https://github.com/colinhacks/zod/issues/105 */
export function zParser<T extends z.ZodType>(schema: T) {
  const _catchErr = (err: unknown) =>
    catchZodError(err, {rootTypeName: schema.description})

  const parseUnknown = (
    ...args: Parameters<typeof schema.parse>
  ): z.output<T> => {
    try {
      return schema.parse(...args) as unknown
    } catch (err) {
      return _catchErr(err)
    }
  }
  const parseUnknownAsync: typeof schema.parseAsync = (
    ...args: Parameters<typeof schema.parseAsync>
  ): Promise<z.output<T>> => schema.parseAsync(...args).catch(_catchErr)

  return {
    schema,
    _input: schema._input as z.input<T>,
    _output: schema._output as z.output<T>,
    parseUnknown,
    parse: (
      input: T['_input'],
      ...rest: Rest1<Parameters<typeof parseUnknown>>
    ) =>
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      parseUnknown(input, ...rest),
    parseUnknownAsync,
    parseAsync: (
      input: T['_input'],
      ...reest: Rest1<Parameters<typeof parseUnknown>>
    ) => parseUnknownAsync(input, ...reest),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rest1<T extends [any, ...any[]]> = T extends [any, ...infer U] ? U : []

export function catchZodError(err: unknown, opts?: {rootTypeName?: string}) {
  if (err instanceof z.ZodError && err.issues[0]) {
    const issue = err.issues[0]
    const paths = R.compact([opts?.rootTypeName, ...issue.path])
    throw new Error(`${issue.code} at ${paths.join('.')}: ${issue.message}`)
  }
  throw err
}
