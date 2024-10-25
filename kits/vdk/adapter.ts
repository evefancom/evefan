import {remoteProcedure} from '@openint/cdk/internal'
import {
  BadRequestError,
  TRPCError,
  type AnyProcedure,
  type AnyRouter,
  type inferProcedureInput,
  type inferProcedureOutput,
  type MaybePromise,
} from '@openint/trpc'

export function verticalProcedure(adapterMap: AdapterMap) {
  return remoteProcedure.use(async ({next, ctx}) => {
    const {connectorName} = ctx.remote
    const adapter = adapterMap[connectorName]
    if (!adapter) {
      throw new BadRequestError(`Adapter ${connectorName} not found`)
    }
    return next({ctx: {...ctx, adapter}})
  })
}

export type VerticalProcedureContext = ReturnType<
  ReturnType<typeof verticalProcedure>['query']
>['_def']['_ctx_out']

export interface AdapterMap {
  [k: string]: Adapter
}

/** To be refactored out of vdk probably...  */

export type Adapter = Record<string, (...args: any[]) => any>

export type AdapterFromRouter<
  TRouter extends AnyRouter,
  TInstance = {},
  TCtx = VerticalProcedureContext,
> = {
  [k in keyof TRouter as TRouter[k] extends AnyProcedure
    ? k
    : never]?: TRouter[k] extends AnyProcedure
    ? (opts: {
        ctx: TCtx
        instance: TInstance
        input: inferProcedureInput<TRouter[k]>
      }) => MaybePromise<inferProcedureOutput<TRouter[k]>>
    : never
}

/**
 * Workaround for situation where we do not want to set an override of the base url
 * and simply want to use the default.
 * TODO: Rethink the interface between nangoProxyLink, proxyCallProvider and the providers themselves to
 * make this relationship clearer
 */
export const PLACEHOLDER_BASE_URL = 'http://placeholder'

export async function proxyCallAdapter({
  input,
  ctx,
}: {
  input: unknown
  ctx: VerticalProcedureContext
}) {
  const methodName = ctx.path.split('.').pop() ?? ''
  const implementation = ctx.adapter?.[methodName] as Function

  if (typeof implementation !== 'function') {
    throw new TRPCError({
      code: 'NOT_IMPLEMENTED',
      message: `${ctx.remote.connectorName} provider does not implement ${ctx.path}`,
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const out = await implementation({instance: ctx.remote.instance, input, ctx})
  // console.log('[proxyCallRemote] output', out)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return out
}
