import type {OpenApiMeta} from '@lilyrose2798/trpc-openapi'
import {initTRPC, TRPCError} from '@trpc/server'
// FIXME: We should not be hacking imports like this.
import type {ExtEndUserId, Viewer, ViewerRole} from '../../kits/cdk/viewer'
import type {RouterContext} from '../engine-backend/context'

/** @deprecated. Dedupe me from cdk hasRole function */
function hasRole<R extends ViewerRole>(
  viewer: Viewer,
  roles: R[],
): viewer is Viewer<R> {
  return roles.includes(viewer.role as R)
}

/** Used for external systems */
export function getExtEndUserId(
  viewer: Viewer<'end_user' | 'user' | 'org' | 'system'>,
) {
  switch (viewer.role) {
    case 'end_user':
      return `eusr_${viewer.endUserId}` as ExtEndUserId
    case 'user':
      // Falling back to userId should not generally happen
      return (viewer.orgId ?? viewer.userId) as ExtEndUserId
    case 'org':
      return viewer.orgId as ExtEndUserId
    case 'system':
      return 'system' as ExtEndUserId
  }
}

export interface RouterMeta extends OpenApiMeta {
  /** @deprecated */
  response?: {
    vertical: 'accounting' | 'investment'
    entity:
      | 'account'
      | 'expense'
      | 'vendor'
      | 'security'
      | 'holding'
      | 'transaction'
    type: 'list' // | 'get'
  }
}

// Technically trpc doesn't quite belong in here... However it adds complexity to do dependency injection
// into each vertical so we are keeping it super simple for now...
export const trpc = initTRPC
  .context<RouterContext>()
  .meta<RouterMeta>()
  .create({
    allowOutsideOfServer: true,
    errorFormatter(opts) {
      const {shape, error} = opts
      if (!(error.cause?.name === 'HTTPError')) {
        return shape
      }
      const cause = error.cause as unknown as {response: {data: unknown} | null}

      // We cannot use the errorFormatter to modify here because trpc-openapi does not respect data.httpStatus field
      // so we need to catch it further upstream. But we can add some fields... Maybe we need an explicit className field?
      return {
        // This doesn't seem to work so well in prod as name can be mangled...
        class: error.constructor.name,
        ...shape,
        data: cause.response
          ? {
              ...cause.response,
              // Renaming body to be nicer. otherwise we end up with data.data
              data: undefined,
              body: cause.response.data,
            }
          : shape.data,
      }
    },
    // if (error instanceof NoLongerAuthenticatedError) {
    //   return {code: ''}
    // }
    // // TODO: We need better logic around this... 500 from BYOS is very different from
    // // 500 from our platform. This is likely not a good heuristic at the moement...
    // if (err instanceof HTTPError && err.code >= 500) {
    //   return 'REMOTE_ERROR'
    // }
    // // Anything else non-null would be considered internal error.
    // if (err != null) {
    //   return 'INTERNAL_ERROR'
    // }
    // console.log('errorFormatter', opts)
    // shape.data.httpStatus = 401

    //   return {
    //     ...shape,
    //     code: -32600,
    //     data: {
    //       ...shape.data,
    //       code: 'BAD_REQUEST',
    //       httpStatus: 409,
    //     },
    //   }
    // },
  })

// All the headers we accept here...
export const publicProcedure = trpc.procedure.use(async ({next, ctx, path}) =>
  next({ctx: {...ctx, path}}),
)

export function getProtectedContext(ctx: RouterContext) {
  console.log('getProtectedContext DEBUG', ctx.viewer)
  if (!hasRole(ctx.viewer, ['end_user', 'user', 'org', 'system'])) {
    throw new TRPCError({
      code: ctx.viewer.role === 'anon' ? 'UNAUTHORIZED' : 'FORBIDDEN',
    })
  }
  const asOrgIfNeeded =
    ctx.viewer.role === 'end_user'
      ? ctx.as('org', {orgId: ctx.viewer.orgId})
      : ctx.services
  const extEndUserId = getExtEndUserId(ctx.viewer)
  return {...ctx, viewer: ctx.viewer, asOrgIfNeeded, extEndUserId}
}

export type ProtectedContext = ReturnType<typeof getProtectedContext>

export const protectedProcedure = publicProcedure.use(({next, ctx}) =>
  next({ctx: getProtectedContext(ctx)}),
)

export const adminProcedure = publicProcedure.use(({next, ctx}) => {
  if (!hasRole(ctx.viewer, ['user', 'org', 'system'])) {
    throw new TRPCError({
      code: ctx.viewer.role === 'anon' ? 'UNAUTHORIZED' : 'FORBIDDEN',
    })
  }
  return next({ctx: {...ctx, viewer: ctx.viewer}})
})

export const systemProcedure = publicProcedure.use(({next, ctx}) => {
  if (!hasRole(ctx.viewer, ['system'])) {
    throw new TRPCError({
      code: ctx.viewer.role === 'anon' ? 'UNAUTHORIZED' : 'FORBIDDEN',
    })
  }
  return next({ctx: {...ctx, viewer: ctx.viewer}})
})
