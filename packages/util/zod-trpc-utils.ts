/* eslint-disable @typescript-eslint/no-unsafe-return */
import * as R from 'remeda'
import type {AnyProcedure, AnyRouter, inferProcedureParams} from '@trpc/server'
import {initTRPC} from '@trpc/server'
import {z} from 'zod'

import type {AnyZFunction, ZFunction} from './zod-function-utils'

/* eslint-disable @typescript-eslint/no-explicit-any */
type _AnyZFunction = ZFunction<any, any>
export type ZFunctionMap = Record<string, _AnyZFunction | unknown>

export function routerFromZFunctionMap<TMap extends ZFunctionMap>(
  functionMap: TMap,
): AnyRouter {
  const trpcServer = initTRPC.create()
  return trpcServer.router(
    R.pipe(
      functionMap as Record<string, AnyZFunction>,
      // Protected against non zFunction being part of the zFunction map so we do not crash...
      R.omitBy((fn) => !fn.impl),
      R.mapValues((fn) =>
        trpcServer.procedure
          .input(preprocessArgsTuple(fn.parameters))
          .output(fn.returnType)
          .mutation(({input}) => fn.impl(...input)),
      ),
    ),
  )
}

export function preprocessArgsTuple<
  T extends z.ZodTuple<[z.ZodTypeAny, ...z.ZodTypeAny[]] | []>,
>(schema: T) {
  return z.preprocess((i) => {
    const ret = R.pipe(Array.isArray(i) ? i : [i], (arr) => [
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      ...arr.slice(0, schema.items.length),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      ...new Array(Math.max(schema.items.length - arr.length, 0)),
    ])
    // console.log('Preprocessed', ret)
    return ret
  }, schema)
}

export function getInputSchema<T extends AnyProcedure>(proc: T) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (!proc._def.inputs[0]) {
    throw new Error(`${proc.name} has no runtime input schema`)
  }
  // TODO: We are unable to know whether the parser was
  // zodType object, enum or something else.
  // @see https://github.com/trpc/trpc/issues/4295
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  return proc._def.inputs[0] as z.ZodType<
    inferProcedureParams<T>['_input_out'],
    any,
    inferProcedureParams<T>['_input_in']
  >
}

export function getOutputSchema<T extends AnyProcedure>(proc: T) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (!proc._def.output) {
    throw new Error(`${proc.name} has no runtime output schema`)
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  return proc._def.output as z.ZodType<
    inferProcedureParams<T>['_output_out'],
    z.ZodTypeDef,
    inferProcedureParams<T>['_output_in']
  >
}
