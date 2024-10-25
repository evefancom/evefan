import {
  clerkClient,
  getAuth,
  auth as serverComponentGetAuth,
} from '@clerk/nextjs/server'
import {dehydrate, QueryClient} from '@tanstack/react-query'
import {createServerSideHelpers} from '@trpc/react-query/server'
import {TRPCError} from '@trpc/server'
import {getHTTPStatusCodeFromError} from '@trpc/server/http'
import type {
  GetServerSidePropsContext,
  NextApiRequest,
  NextApiResponse,
} from 'next'
import type {ReadonlyHeaders} from 'next/dist/server/web/spec-extension/adapters/headers'
import type {ReadonlyRequestCookies} from 'next/dist/server/web/spec-extension/adapters/request-cookies'
import {NextResponse} from 'next/server'
import superjson from 'superjson'
import type {SuperJSONResult} from 'superjson/dist/types'
import {contextFactory} from '@openint/app-config/backendConfig'
import {
  kAccessToken,
  kApikeyHeader,
  kApikeyMetadata,
  kApikeyUrlParam,
} from '@openint/app-config/constants'
import {envRequired} from '@openint/app-config/env'
import type {Id, UserId, Viewer} from '@openint/cdk'
import {decodeApikey, makeJwtClient} from '@openint/cdk'
import {flatRouter} from '@openint/engine-backend'
import {fromMaybeArray} from '@openint/util'

export interface PageProps {
  dehydratedState?: SuperJSONResult // SuperJSONResult<import('@tanstack/react-query').DehydratedState>
}

type NextContext =
  | {req: NextApiRequest; res: NextApiResponse} // Next.js 12 api routes
  | GetServerSidePropsContext // Next.js 12 pages/
  // Next.js 13 server components
  | {
      headers?: () => ReadonlyHeaders
      cookies?: () => ReadonlyRequestCookies
      /** Query Params */
      searchParams?:
        | Record<string, string[] | string | undefined>
        | URLSearchParams
    }

export function serverSideHelpersFromViewer(viewer: Viewer) {
  const ctx = {
    ...contextFactory.fromViewer(viewer),
    remoteResourceId: null,
  }
  const queryClient = new QueryClient()

  const caller = flatRouter.createCaller(ctx)

  const ssg = createServerSideHelpers({
    queryClient,
    router: flatRouter,
    ctx,
    // transformer: superjson,
  })
  return {ssg, caller, ctx, queryClient}
}

export async function createSSRHelpers(context: NextContext) {
  // TODO: Remove this once we fully migrate off next.js 12 routing
  await import('@openint/app-config/register.node')

  const viewer = await serverGetViewer(context)
  const {ssg, ctx, queryClient, caller} = serverSideHelpersFromViewer(viewer)

  return {
    viewer,
    ssg,
    ctx,
    caller,
    getDehydratedState: () => superjson.serialize(dehydrate(queryClient)),
    /** @deprecated */
    getPageProps: (): PageProps => ({
      dehydratedState: superjson.serialize(dehydrate(queryClient)),
    }),
  }
}

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
// TODO: Dedupe by calling out to viewerFromRequest. Probably best to call this
// viewerFromNextContext
export async function serverGetViewer(
  context: NextContext,
  // This is a hack for not knowing how else to return accessToken...
  // and not wanting it to add it to the super simple viewer interface just yet
  // Fwiw this is only used for the /connect experience and not generally otherwise
): Promise<Viewer & {accessToken?: string | null}> {
  const jwt = makeJwtClient({
    secretOrPublicKey: envRequired.JWT_SECRET,
  })
  const headers =
    'req' in context
      ? context.req.headers
      : Object.fromEntries(context.headers?.().entries() ?? [])
  const searchParams =
    ('query' in context
      ? context.query
      : 'req' in context
        ? context.req.query
        : context.searchParams instanceof URLSearchParams
          ? Object.fromEntries(context.searchParams.entries())
          : context.searchParams) ?? {}

  // console.log('headers', headers)
  // console.log('searchParams', searchParams)

  // access token via query param
  let accessToken = fromMaybeArray(searchParams[kAccessToken])[0]
  let viewer = jwt.verifyViewer(accessToken)
  // console.log('accessToken', accessToken, viewer)

  if (viewer.role !== 'anon') {
    return {...viewer, accessToken}
  }
  // access token via header
  accessToken = headers.authorization?.match(/^Bearer (.+)/)?.[1]
  viewer = jwt.verifyViewer(accessToken)
  if (viewer.role !== 'anon') {
    return {...viewer, accessToken}
  }

  // personal access token via query param or header
  const apikey = fromMaybeArray(
    searchParams[kApikeyUrlParam] || headers[kApikeyHeader],
  )[0]

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
  // TODO: Do not crash if we do not have middleware... super annoying...
  const auth =
    'req' in context ? getAuth(context.req) : serverComponentGetAuth()

  // console.log('auth', auth)
  if (auth.userId) {
    return {
      role: 'user',
      userId: auth.userId as UserId,
      orgId: auth.orgId as Id['org'],
    }
  }

  return {role: 'anon'}
}

/** @deprecated For serverSideProps */
export async function serverGetUser(
  context:
    | GetServerSidePropsContext
    | {req: NextApiRequest; res: NextApiResponse},
) {
  const viewer = await serverGetViewer(context)
  if (viewer.role !== 'user') {
    return [null] as const
  }
  return [{id: viewer.userId}] as const
}

export function respondToCORS(req: NextApiRequest, res: NextApiResponse) {
  // https://vercel.com/support/articles/how-to-enable-cors

  res.setHeader('Access-Control-Allow-Credentials', 'true')
  // Need to use the request origin for credentials-mode "include" to work
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin ?? '*')
  // prettier-ignore
  res.setHeader('Access-Control-Allow-Methods', req.headers['access-control-request-method'] ?? '*')
  // prettier-ignore
  res.setHeader('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] ?? '*')
  if (req.method === 'OPTIONS') {
    console.log('Respond to OPTIONS request', req.headers.origin)
    res.status(200).end()
    return true
  }
  return false
}

/** TODO: Turn this into a middleware that gets used in most places... */
export async function withErrorHandler(fn: () => Promise<NextResponse>) {
  try {
    return await fn()
  } catch (err) {
    if (err instanceof TRPCError) {
      return trpcErrorResponse(err)
    }
    return NextResponse.json({error: {message: `${err}`}}, {status: 500})
  }
}

export function trpcErrorResponse(err: TRPCError) {
  const status = getHTTPStatusCodeFromError(err)
  // https://trpc.io/docs/server/error-handling
  return NextResponse.json(
    {error: {message: err.message, code: err.code}},
    {status},
  )
}
