import {clerkClient} from '@clerk/nextjs/server'
import {createOpenApiFetchHandler} from '@lilyrose2798/trpc-openapi'
import {applyLinks, corsLink} from '@opensdks/fetch-links'
import {pickBy} from 'remeda'
import {contextFactory} from '@openint/app-config/backendConfig'
import {
  kAccessToken,
  kApikeyHeader,
  kApikeyMetadata,
  kApikeyUrlParam,
} from '@openint/app-config/constants'
import type {Id, Viewer} from '@openint/cdk'
import {decodeApikey, makeJwtClient, zEndUserId, zId} from '@openint/cdk'
import type {RouterContext} from '@openint/engine-backend'
import {envRequired} from '@openint/env'
import {
  BadRequestError,
  getHTTPResponseFromError,
  isHttpError,
  TRPCError,
  z,
  type AnyRouter,
} from '@openint/vdk'
import type {AppRouter} from './appRouter'

export const zOpenIntHeaders = z
  .object({
    [kApikeyHeader]: z.string().nullish(),
    'x-resource-id': zId('reso').nullish(),
    /** Alternative ways to pass the resource id, works in case there is a single connector */
    'x-resource-connector-name': z.string().nullish(),
    'x-resource-connector-config-id': zId('ccfg').nullish(),
    /** Implied by authorization header when operating in end user mode */
    'x-resource-end-user-id': zEndUserId.nullish(),
    authorization: z.string().nullish(), // `Bearer ${string}`
  })
  .catchall(z.string().nullish())

export type OpenIntHeaders = z.infer<typeof zOpenIntHeaders>

/** Determine the current viewer in this order
 * access token via query param
 * access token via header
 * apiKey via query param
 * api key via header
 * next.js cookie
 * fall back to anon viewer
 * TODO: Figure out how to have the result of this function cached for the duration of the request
 * much like we cache
 */
export async function viewerFromRequest(
  req: Request,
  // This is a hack for not knowing how else to return accessToken...
  // and not wanting it to add it to the super simple viewer interface just yet
  // Fwiw this is only used for the /connect experience and not generally otherwise
): Promise<Viewer & {accessToken?: string | null}> {
  const jwt = makeJwtClient({
    secretOrPublicKey: envRequired.JWT_SECRET,
  })

  // console.log('headers', headers)
  // console.log('searchParams', searchParams)

  const url = new URL(req.url)

  // access token via query param
  let accessToken = url.searchParams.get(kAccessToken) ?? undefined

  let viewer = jwt.verifyViewer(accessToken)
  if (viewer.role !== 'anon') {
    return {...viewer, accessToken}
  }
  // access token via header
  accessToken = req.headers.get('authorization')?.match(/^Bearer (.+)/)?.[1]
  viewer = jwt.verifyViewer(accessToken)
  if (viewer.role !== 'anon') {
    return {...viewer, accessToken}
  }

  // personal access token via query param or header
  const apikey =
    url.searchParams.get(kApikeyUrlParam) || req.headers.get(kApikeyHeader)

  // No more api keys, gotta fix me here.
  if (apikey) {
    const [id, key] = decodeApikey(apikey)

    const res = id.startsWith('user_')
      ? await clerkClient.users.getUser(id)
      : id.startsWith('org_')
        ? await clerkClient.organizations.getOrganization({organizationId: id})
        : null

    // console.log('apikey', {apiKey: apikey, id, key, res})

    if (res?.privateMetadata?.[kApikeyMetadata] === key) {
      return res.id.startsWith('user_')
        ? {role: 'user', userId: res.id as Id['user']}
        : {role: 'org', orgId: res.id as Id['org']}
    }
    // console.warn('Invalid api key, ignoroing', {apiKey: apikey, id, key, res})
  }
  return {role: 'anon'}
}

export const contextFromRequest = async ({
  req,
}: {
  req: Request
}): Promise<RouterContext> => {
  const viewer = await viewerFromRequest(req)
  const context = contextFactory.fromViewer(viewer)
  const headers = zOpenIntHeaders.parse(
    Object.fromEntries(req.headers.entries()),
  )
  let resourceId = req.headers.get('x-resource-id') as Id['reso'] | undefined
  if (!resourceId) {
    // TODO: How do we allow filtering for organization owned resources?
    // Specifically making sure that endUserId = null?
    // TODO: make sure this corresponds to the list resources api
    const resourceFilters = pickBy(
      {
        // endUserId shall be noop when we are in end User viewer as services
        // are already secured by row level security
        endUserId: headers['x-resource-end-user-id'],
        connectorName: headers['x-resource-connector-name'],
        connectorConfigId: headers['x-resource-connector-config-id'],
      },
      (v) => v != null,
    )
    if (Object.keys(resourceFilters).length > 0) {
      const resources = await context.services.metaService.tables.resource.list(
        {...resourceFilters, limit: 2},
      )
      if (resources.length > 1) {
        throw new BadRequestError(
          `Multiple resources found for filter: ${JSON.stringify(
            resourceFilters,
          )}`,
        )
      }
      resourceId = resources[0]?.id
    }
  }
  console.log('[contextFromRequest]', {url: req.url, viewer, resourceId})
  return {
    ...context,
    remoteResourceId: resourceId ?? null,
  }
}

export function createRouterHandler({
  endpoint = '/api/v0',
  router,
}: {
  endpoint?: `/${string}`
  router: AnyRouter
}) {
  const openapiRouteHandler = async (req: Request) => {
    // Respond to CORS preflight requests
    // TODO: Turn this into a fetch link...
    const corsHeaders = {
      'Access-Control-Allow-Credentials': 'true',
      // Need to use the request origin for credentials-mode "include" to work
      'Access-Control-Allow-Origin': req.headers.get('origin') ?? '*',
      // prettier-ignore
      'Access-Control-Allow-Methods': req.headers.get('access-control-request-method') ?? '*',
      // prettier-ignore
      'Access-Control-Allow-Headers': req.headers.get('access-control-request-headers')?? '*',
    }
    if (req.method.toUpperCase() === 'OPTIONS') {
      return new Response(null, {status: 204, headers: corsHeaders})
    }
    // Now handle for reals
    try {
      const context = await contextFromRequest({req})
      // More aptly named handleOpenApiFetchRequest as it returns a response already
      const res = await createOpenApiFetchHandler({
        endpoint,
        req,
        router: router as AppRouter,
        createContext: () => context,
        // TODO: handle error status code from passthrough endpoints
        // onError, // can only have side effect and not modify response error status code unfortunately...
        responseMeta: ({errors, ctx: _ctx}) => {
          // Pass the status along
          for (const err of errors) {
            console.warn(
              '[TRPCError]',
              {
                // customerId: ctx?.headers.get('x-customer-id'),
                // providerName: ctx?.headers.get('x-provider-name'),
              },
              err,
            )
            if (isHttpError(err.cause)) {
              // Maybe rename this to status within the error object?
              return {status: err.cause.code}
            }
          }
          return {}
        },
      })
      // Pass the resourceId back to the client so there is certainly on which ID
      // was used to fetch the data
      if (context.remoteResourceId) {
        res.headers.set('x-resource-id', context.remoteResourceId)
      }
      for (const [k, v] of Object.entries(corsHeaders)) {
        res.headers.set(k, v)
      }
      return res
    } catch (err) {
      console.error('[trpc.createRouterHandler] error', err)
      if (err instanceof TRPCError) {
        const ret = await getHTTPResponseFromError(err)
        return new Response(JSON.stringify(ret.body), {
          status: ret.status,
          headers: {'Content-Type': 'application/json'},
        })
      }
      throw err
    }
  }
  return (req: Request) => applyLinks(req, [corsLink(), openapiRouteHandler])
}
