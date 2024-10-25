import {contextFactory} from '@openint/app-config/backendConfig'
import {respondToCORS, serverGetViewer} from '@/lib-server/server-helpers'
import '@openint/app-config/register.node'
import type {TRPCError} from '@trpc/server'
import * as trpcNext from '@trpc/server/adapters/next'
import type {NextApiHandler} from 'next'
import {appRouter} from '@openint/api'
import type {Id} from '@openint/cdk'
import type {RouterContext} from '@openint/engine-backend'
import {parseWebhookRequest} from '@openint/engine-backend'
import {fromMaybeArray, HTTPError} from '@openint/util'

/** https://trpc.io/docs/server/error-handling */
const HTTP_CODE_TO_TRPC_CODE = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  408: 'TIMEOUT',
  409: 'CONFLICT',
  412: 'PRECONDITION_FAILED',
  413: 'PAYLOAD_TOO_LARGE',
  405: 'METHOD_NOT_SUPPORTED',
  422: 'UNPROCESSABLE_CONTENT',
  429: 'TOO_MANY_REQUESTS',
  499: 'CLIENT_CLOSED_REQUEST',
  500: 'INTERNAL_SERVER_ERROR',
} satisfies Record<number, TRPCError['code']>

export const createContext: Parameters<
  typeof trpcNext.createNextApiHandler
>[0]['createContext'] = async ({req, res}): Promise<RouterContext> => {
  const viewer = await serverGetViewer({req, res})
  console.log('[trpc.createContext]', {query: req.query, viewer})
  return {
    ...contextFactory.fromViewer(viewer),
    remoteResourceId:
      (fromMaybeArray(req.headers['x-resource-id'])[0] as Id['reso']) ?? null,
  }
}

export const onError: Parameters<
  typeof trpcNext.createNextApiHandler
>[0]['onError'] = ({error, path}) => {
  // Force passthrough the HTTP error code.
  if (path === 'passthrough' && error.cause instanceof HTTPError) {
    const newCode =
      HTTP_CODE_TO_TRPC_CODE[
        error.cause.code as keyof typeof HTTP_CODE_TO_TRPC_CODE
      ]
    Object.assign(error, {code: newCode ?? error.code})
  } else {
    console.warn('error', error)
  }
}

const handler = trpcNext.createNextApiHandler({
  router: appRouter,
  createContext,
  onError,
})

export default (function trpcHandler(req, res) {
  if (respondToCORS(req, res)) {
    return
  }
  // TODO: Split out webhook into its own function...
  const segments = req.query['trpc'] as [string] | string

  if (Array.isArray(segments) && parseWebhookRequest.isWebhook(segments)) {
    // TODO: #inngestMe This is where we can call inngest.send rather than handling webhooks synchronously.
    const {procedure, ...ret} = parseWebhookRequest({
      method: req.method,
      headers: req.headers,
      pathSegments: segments,
      query: req.query,
      body: req.body,
    })
    req.query = ret.query as (typeof req)['query']
    req.query['trpc'] = procedure
    req.body = ret.body
  }
  return handler(req, res)
} satisfies NextApiHandler)
