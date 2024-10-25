import {appRouter} from './appRouter'
import {createRouterHandler} from './createRouterHandler'

export * from './appRouter'
export * from './createRouterHandler'
export * from './proxyHandler'

// TODO: Make me work
export function createAppHandler(
  opts: {
    endpoint?: `/${string}`
  } = {},
) {
  return createRouterHandler({...opts, router: appRouter})
}
