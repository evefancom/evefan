import type NangoFrontend from '@nangohq/frontend'
import type {AuthError} from '@nangohq/frontend'
import {HTTPError} from '@opensdks/runtime'
import type {NangoSDK} from '@opensdks/sdk-nango'
import type {
  NangoProvider,
  UpsertIntegration,
} from '@opensdks/sdk-nango/src/nango.oas'
import {z} from '@opensdks/util-zod'
import {makeUlid} from '@openint/util'
import type {
  ConnectorSchemas,
  ConnectorServer,
  ConnHelpers,
} from '../connector.types'
import {CANCELLATION_TOKEN} from '../frontend-utils'
import type {Id} from '../id.types'
import {extractId, makeId, zId} from '../id.types'
import {zNangoError} from './NangoClient'

export const zAuthMode = z
  .enum(['OAUTH2', 'OAUTH1', 'BASIC', 'API_KEY'])
  .openapi({ref: 'AuthMode'})

export const oauthBaseSchema = {
  name: z.literal('__oauth__'), // TODO: This is a noop
  connectorConfig: z.object({
    oauth: z.object({
      client_id: z.string(),
      client_secret: z.string(),
      /** comma deliminated scopes with no spaces in between */
      scopes: z.string().optional(),
    }),
  }),
  resourceSettings: z.object({
    oauth: z.object({
      credentials: z.object({
        type: zAuthMode,
        /** For API key auth... */
        api_key: z.string().nullish(),
        access_token: z.string().optional(),
        refresh_token: z.string().optional(),
        expires_at: z.string().datetime(),
        raw: z.object({
          access_token: z.string(),
          expires_in: z.number(),
          expires_at: z.string().datetime(),
          /** Refresh token (Only returned if the REFRESH_TOKEN boolean parameter is set to true and the refresh token is available) */
          refresh_token: z.string().nullish(),
          refresh_token_expires_in: z.number().nullish(),
          token_type: z.string(), //'bearer',
          scope: z.string().optional(),
        }),
      }),
      connection_config: z
        .object({
          portalId: z.number().nullish(),
          instance_url: z.string().nullish(),
        })
        .catchall(z.unknown())
        .nullish(),
      metadata: z.record(z.unknown()).nullable(),
    }),
  }),
  connectOutput: z.object({
    providerConfigKey: zId('ccfg'),
    connectionId: zId('reso'),
  }),
} satisfies ConnectorSchemas

export type OauthBaseTypes = ConnHelpers<typeof oauthBaseSchema>['_types']

function isNangoAuthError(err: unknown): err is AuthError {
  return typeof err === 'object' && err != null && 'type' in err
}

/** Aka `nangoConnect` */
export function oauthConnect({
  nangoFrontend,
  connectorName,
  connectorConfigId,
  resourceId,
  authOptions,
}: {
  nangoFrontend: NangoFrontend
  connectorName: string
  connectorConfigId: Id['ccfg']
  /** Should address the re-connect scenario, but let's see... */
  resourceId?: Id['reso']
  authOptions?: {
    authorization_params?: Record<string, string | undefined>
  }
}): Promise<OauthBaseTypes['connectOutput']> {
  // console.log('oauthConnect', {
  //   connectorName,
  //   connectorConfigId,
  //   resourceId,
  //   authOptions,
  // })
  return nangoFrontend
    .auth(
      connectorConfigId,
      resourceId ?? makeId('reso', connectorName, makeUlid()),
      {
        params: {},
        ...authOptions,
        // authOptions would tend to contain the authorization_params needed to make the initial connection
        // authorization_params: {
        //   scope: 'https://www.googleapis.com/auth/drive.readonly',
        // },
      },
    )
    .then((r) => oauthBaseSchema.connectOutput.parse(r))
    .catch((err) => {
      if (isNangoAuthError(err)) {
        if (err.type === 'user_cancelled') {
          throw CANCELLATION_TOKEN
        }
        throw new Error(`${err.type}: ${err.message}`)
      }
      throw err
    })
}

/** aka `makeNangoConnectorServer` */
export function makeOauthConnectorServer({
  nangoClient,
  nangoProvider,
  ccfgId,
}: {
  nangoClient: NangoSDK
  nangoProvider: NangoProvider
  ccfgId: Id['ccfg']
}) {
  const connServer = {
    async postConnect(connectOutput) {
      const {connectionId: resoId} = connectOutput
      const res = await nangoClient
        .GET('/connection/{connectionId}', {
          params: {
            path: {connectionId: resoId},
            query: {
              provider_config_key: ccfgId,
              refresh_token: true,
              // thought this would make forceRefresh work but wasn't called in the getResource code path
              // force_refresh: true,
            },
          },
        })
        .then((r) => r.data)
      return {resourceExternalId: extractId(resoId)[2], settings: {oauth: res}}
    },
  } satisfies ConnectorServer<typeof oauthBaseSchema>
  return {
    ...connServer,
    upsertConnectorConfig: async (
      config: OauthBaseTypes['connectorConfig'],
    ) => {
      const body: UpsertIntegration = {
        provider_config_key: ccfgId,
        provider: nangoProvider,
        oauth_client_id: config.oauth.client_id,
        oauth_client_secret: config.oauth.client_secret,
        oauth_scopes: config.oauth.scopes,
      }
      await nangoClient.PUT('/config', {body}).catch(async (err) => {
        console.log('got error of type')
        // This is very error prone... If we have different versions runtime
        // Then instanceof in one case would not be the same as instanceof in another case...
        // maybe we should do ducktyping instead of using instanceof?
        // And in general we need a better story around error types in openSDKs anyways
        if (err instanceof HTTPError) {
          const nangoErr = zNangoError.parse(await err.response.json())
          // console.log('httpError', err, nangoErr, nangoErr.error.code)
          if (nangoErr.error.code === 'unknown_provider_config') {
            return nangoClient.POST('/config', {body})
          }
        }
        throw err
      })
    },
  }
}
