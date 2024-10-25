import type {clerkClient} from '@clerk/nextjs/server'
import type {
  AnyConnectorImpl,
  EndUserId,
  Id,
  LinkFactory,
  NangoSDK,
} from '@openint/cdk'
import {initNangoSDK} from '@openint/cdk'
import type {JWTClient, Viewer, ViewerRole} from '@openint/cdk/viewer'
import {makeJwtClient, zViewerFromJwtPayload} from '@openint/cdk/viewer'
import {TRPCError} from '@openint/trpc'
import {R} from '@openint/util'
import type {Env} from '../../apps/app-config/env'
import {makeServices as _makeServices} from './services'
import type {AuthProvider} from './services/AuthProvider'
// Should we actually do this hmm
import type {_ConnectorConfig} from './services/dbService'
import type {MetaService} from './services/metaService'

type Services = ReturnType<typeof _makeServices>
export interface RouterContext {
  /** Not used at the moment... Comment out to discover issues */
  headers?: Headers
  // Viewer-dependent
  viewer: Viewer
  /** Helpers with the designated permission level */
  services: Services
  /** Impersonate a different permission level explicitly */
  as<R extends ViewerRole>(role: R, data: Omit<Viewer<R>, 'role'>): Services

  /** Need to refactor this */
  clerk: typeof clerkClient
  // Non-viewer dependent
  connectorMap: Record<string, AnyConnectorImpl>
  jwt: JWTClient
  nango: NangoSDK
  env: Env
  /**
   * Base url of the engine-backend router when deployed, e.g. `localhost:3000/api/usevenice`
   * This is needed for 1) server side rendering and 2) webhook handling
   */
  apiUrl: string

  /** Used for oauth based resources */
  getRedirectUrl?: (
    connectorConfig: _ConnectorConfig,
    ctx: {endUserId?: EndUserId | null},
  ) => string

  /** For vertical API calls */
  remoteResourceId: Id['reso'] | null
}

export interface ContextFactoryOptions<
  TConnectors extends readonly AnyConnectorImpl[],
  TLinks extends Record<string, LinkFactory>,
> extends Pick<RouterContext, 'apiUrl' | 'getRedirectUrl' | 'clerk'> {
  connectors: TConnectors
  // Backend only
  linkMap?: TLinks

  /** Used for authentication */
  jwtSecret: string
  nangoSecretKey: string
  env: Env

  /** Used to store metadata & configurations */
  getMetaService: (viewer: Viewer) => MetaService

  authProvider: AuthProvider
}

export function getContextFactory<
  TConnectors extends readonly AnyConnectorImpl[],
  TLinks extends Record<string, LinkFactory>,
>(config: ContextFactoryOptions<TConnectors, TLinks>) {
  const {apiUrl, getRedirectUrl, getMetaService, connectors, jwtSecret, env} =
    config
  for (const connector of connectors) {
    if (typeof connector.name !== 'string') {
      console.error('Invalid connector', connector)
      throw new Error(`Invalid connector: name=${connector.name}`)
    }
  }
  const connectorMap = R.mapToObj(connectors, (p) => [p.name, p])
  const jwt = makeJwtClient({secretOrPublicKey: jwtSecret})

  const getServices = (viewer: Viewer) =>
    _makeServices({
      metaService: getMetaService(viewer),
      connectorMap,
      env,
      authProvider: config.authProvider,
    })

  function fromViewer(viewer: Viewer): Omit<RouterContext, 'remoteResourceId'> {
    return {
      viewer,
      as: (role, data) => getServices({role, ...data} as Viewer),
      services: getServices(viewer),
      // --- Non-viewer dependent
      connectorMap,
      jwt,
      env,
      nango: initNangoSDK({
        headers: {authorization: `Bearer ${config.nangoSecretKey}`},
      }),
      apiUrl,
      getRedirectUrl,
      clerk: config.clerk,
    }
  }

  /** not sure if this is needed as most codepath gets us viewer via multiple methods */
  function fromJwtToken(token?: string) {
    if (!token) {
      return fromViewer({role: 'anon'})
    }

    try {
      const data = jwt.verifyViewer(token)
      return fromViewer(zViewerFromJwtPayload.parse(data))
    } catch (err) {
      console.warn('JwtError', err)
      throw new TRPCError({code: 'UNAUTHORIZED', message: `${err}`})
    }
  }

  return {config, fromViewer, fromJwtToken}
}
