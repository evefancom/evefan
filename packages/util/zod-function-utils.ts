import {z} from 'zod'

import {isZodType} from './zod-utils'

/** Use fn.implementation to access the raw fn without validation */
export type AnyZFunction = ReturnType<typeof zFunction>

/** Allow for unknown for now */

type _args = [z.ZodTypeAny, ...z.ZodTypeAny[]] | [] | z.ZodTypeAny
type _wrap<T> = T extends z.ZodTypeAny ? [T] : T
type _tuple<Args extends _args> = z.ZodTuple<_wrap<Args>, z.ZodUnknown>

type _fnInner<
  Args extends z.ZodTuple<_wrap<_args>, z.ZodUnknown>,
  Returns extends z.ZodTypeAny,
> = z.InnerTypeOfFunction<Args, Returns>

type _fnOuter<
  Args extends z.ZodTuple<_wrap<_args>, z.ZodUnknown>,
  Returns extends z.ZodTypeAny,
> = z.OuterTypeOfFunction<Args, Returns>

// Need to think whether this is the right thing, given that zod itself does not
// implement inference from impl function, though trpc server does.

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyFunction = (...args: any) => any
type zReturnType<F extends AnyFunction> = z.ZodType<ReturnType<F>, any, any>
/* eslint-enable @typescript-eslint/no-explicit-any */

// Tried to do the equivalent with inferring params z.ZodTuple<Parameters<F>, z.ZodUnknown>
// but that failed @see https://share.cleanshot.com/49pndY

export type ZFunction<
  Args extends _args = [],
  Returns extends z.ZodTypeAny = z.ZodUnknown,
  F extends _fnInner<_tuple<Args>, Returns> = _fnInner<_tuple<Args>, Returns>,
> = _fnOuter<_tuple<Args>, Returns> & {
  parameters: z.ZodTuple<_wrap<Args>>
  returnType: Returns
  type: z.ZodFunction<z.ZodTuple<_wrap<Args>>, Returns>
  impl: F
}

export function zFunction<F extends _fnInner<_tuple<[]>, z.ZodUnknown>>(
  impl: F,
): ZFunction<[], zReturnType<F>, F>
export function zFunction<
  Args extends _args,
  F extends _fnInner<_tuple<Args>, z.ZodUnknown>,
>(args: Args, impl: F): ZFunction<Args, zReturnType<F>, F>
export function zFunction<
  Args extends _args,
  Returns extends z.ZodTypeAny,
  F extends _fnInner<_tuple<Args>, Returns>,
>(args: Args, returns: Returns, impl: F): ZFunction<Args, Returns, F>

/**
 * Adding parameters & returnType to the function itself to help with runtime codegen
 * Can be easily turned into CreateProcedureWithInputOutputParser for use with
 * trpc `.query` / `.mutation`
 *
 * Without `Arg`, function shall accept any[]. aka z.tuple([]).rest(z.unknown())
 * Without `Returns`, function return z.unknown()
 */
export function zFunction<
  Args extends _args,
  Returns extends z.ZodTypeAny,
  F extends _fnInner<_tuple<Args>, Returns>,
>(args: Args | F, returns?: Returns | F, _impl?: F) {
  // Workaround zod limitation @see https://github.com/colinhacks/zod/issues/1264
  const def = new z.ZodFunction({
    ...z.function()._def,
    args: (Array.isArray(args)
      ? z.tuple(args)
      : isZodType(args)
      ? z.tuple([args])
      : z.tuple([])
    ).rest(z.unknown()),
    returns: isZodType(returns) ? returns : z.unknown(),
  })
  const impl = (_impl ?? returns ?? args) as F

  // Not sure how to type meta... Exclude<ZFunction<Arg, Returns, F>, F>
  const meta = {
    /** Convenience accessor for the first param */
    parameters: def.parameters() as _tuple<Args>,
    returnType: def.returnType() as Returns,
    type: def,
    impl,
  }
  // @ts-expect-error // hard to type the z.tuple inner
  const fn = def.implement(impl)
  Object.assign(fn, meta)
  return fn
}

export function isZFunction(input: unknown): input is AnyZFunction {
  const fn = input as AnyZFunction
  return (
    typeof input === 'function' &&
    typeof fn.impl === 'function' &&
    isZodType(fn.parameters) &&
    isZodType(fn.returnType) &&
    isZodType(fn.type)
  )
}
