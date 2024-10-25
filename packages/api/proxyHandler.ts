import {getRemoteContext} from '@openint/cdk'
import {getProtectedContext} from '@openint/trpc'
import {contextFromRequest} from './createRouterHandler'

export const proxyHandler = async (req: Request) => {
  const ctx = await contextFromRequest({req})
  const protectedContext = getProtectedContext(ctx)
  const remoteContext = await getRemoteContext(protectedContext)
  const res = await remoteContext.remote.connector.proxy?.(
    remoteContext.remote.instance,
    req,
  )
  if (!res) {
    return new Response(`Not implemented: ${remoteContext.remoteResourceId}`, {
      status: 404,
    })
  }
  const headers = new Headers(res.headers)
  headers.delete('content-encoding') // No more gzip at this point...
  return new Response(res.body, {
    status: res.status,
    headers,
  })
}
