import type {Link as FetchLink} from '@opensdks/fetch-links'
import {mergeHeaders, modifyRequest} from '@opensdks/fetch-links'
import {initNangoSDK} from '@opensdks/sdk-nango'
import {z} from '@opensdks/util-zod'
import {isHttpError, NotAuthenticatedError} from '@openint/trpc'

const kBaseUrlOverride = 'base-url-override'

interface NangoProxyHeaders {
  authorization: `Bearer ${string}`
  'connection-id': string
  'provider-config-key': string
  /** For defaults w/o override, see https://nango.dev/providers.yaml */
  [kBaseUrlOverride]?: string
  /** Override the decompress option when making requests. Optional, defaults to false */
  decompress?: string
  /** The number of retries in case of failure (with exponential back-off). Optional, default 0. */
  retries?: string
}

export function nangoProxyLink(opts: {
  secretKey: string
  /** `connection-id` header */
  connectionId: string
  /** `provider-config-key` header */
  providerConfigKey: string
  /** Default, can be verriden with `base-url-override` header on a per-request basis */
  baseUrlOverride?: string
  /** `retries` header */
  retries?: number
}): FetchLink {
  const nangoHeaders = {
    authorization: `Bearer ${opts.secretKey}`,
    'connection-id': opts.connectionId,
    'provider-config-key': opts.providerConfigKey,
    retries: String(opts.retries ?? 0),
  } satisfies NangoProxyHeaders

  return async (req, next) => {
    const baseUrlOverride =
      req.headers.get(kBaseUrlOverride) ?? opts.baseUrlOverride
    const baseUrl = baseUrlOverride
      ? baseUrlOverride.endsWith('/')
        ? baseUrlOverride
        : `${baseUrlOverride}/`
      : getBaseUrl(req.url)
    const res = await next(
      modifyRequest(req, {
        url: req.url.replace(baseUrl, 'https://api.nango.dev/proxy/'),
        headers: mergeHeaders(req.headers, nangoHeaders, {
          ...(baseUrlOverride && {[kBaseUrlOverride]: baseUrlOverride}),
        }),
        body: req.body,
      }),
    )
    // When Nango is not able to get up to date token to proxy, it returns a dumb 500 error with generic_error_support
    // so we have to explicitly check...
    if (res.status === 500) {
      const resBody = zErrorBody.safeParse(await res.clone().json())
      if (resBody.success && resBody.data.type === 'generic_error_support') {
        const nango = initNangoSDK({
          headers: {authorization: `Bearer ${opts.secretKey}`},
        })
        const authError = await nango
          .GET('/connection/{connectionId}', {
            params: {
              path: {connectionId: opts.connectionId},
              query: {provider_config_key: opts.providerConfigKey},
            },
          })
          .then(() => null)
          .catch((err) => {
            if (isHttpError(err)) {
              const parsed = zErrorBody.safeParse(err.error)
              if (
                parsed.success &&
                parsed.data.type === 'refresh_token_external_error'
                // authError.error will likely say `The external API returned an error when trying to refresh the access token. Please try again later.`
                // for error type `refresh_token_external_error`. Therefore we cannot be 100% sure that this is due to user being no longer authenticated vs.
                // say the provider auth service being down. But this is the closest approximation we can get so we'll settle for it for now
              ) {
                return parsed.data
              }
            }
            return null
          })
        if (authError) {
          throw new NotAuthenticatedError(
            `[${authError.type}] ${opts.connectionId}/${opts.providerConfigKey}: ${authError.error}`,
            authError,
          )
        }
      }
    }
    return res
  }
}

/** Use this header key to make make sure we are proxying to the right place */
nangoProxyLink.kBaseUrlOverride = kBaseUrlOverride

export function getBaseUrl(urlStr: string) {
  const url = new URL(urlStr)
  return `${url.protocol}//${url.host}/`
}

// TODO: Move these into mgmt once we are able to move proxyLinks out of vdk

const noPrefix = true // env.NANGO_NO_ID_PREFIX === 'true'

/** Support a single connector config aka nango provider per provider name for now */
export function toNangoProviderConfigKey(provider: string) {
  return noPrefix ? provider : `ccfg_${provider}`
}

export function fromNangoProviderConfigKey(provider: string) {
  return noPrefix ? provider : provider.replace(/^ccfg_/, '')
}

export function toNangoConnectionId(customerId: string) {
  return noPrefix ? customerId : `cus_${customerId}`
}

export function fromNangoConnectionId(connectionId: string) {
  return noPrefix ? connectionId : connectionId.replace(/^cus_/, '')
}

// TODO: move this into sdk-nango

/**
 * e.g.
  {
    "error": "An error occurred. Please contact support with this unique id: 1f2f2c6c-0e63-42ff-9d69-8e74d7b105c7",
    "type": "generic_error_support",
    "payload": "1f2f2c6c-0e63-42ff-9d69-8e74d7b105c7"
  }
 */
const zErrorBody = z.object({
  error: z.string(),
  type: z.string(),
  payload: z.unknown(),
})

/**
 * e.g. {
  "id": 1231,
  "created_at": "2024-03-05T01:07:40.038Z",
  "updated_at": "2024-03-05T01:07:40.038Z",
  "provider_config_key": "ccfg_hubspot",
  "connection_id": "cus_64a350c383ea68001832fd8a",
  "credentials": {
    "type": "OAUTH2",
    "access_token": "....,
    "expires_at": "2024-03-05T07:05:45.162Z",
    "raw": {
      "token_type": "bearer",
      "access_token": "....,
      "expires_in": 1800,
      "expires_at": "2024-03-05T07:05:45.162Z"
    }
  },
  "connection_config": {
    "portalId": 12123,
    "instance_url": "https://$salesforce_instance_url"
  },
  "metadata": null,
  "credentials_iv": "iMx2dfda4dZZRcaca+wTtT",
  "credentials_tag": "j0TONTfdabadfa/E69eQ==",
  "environment_id": 512,
  "deleted": false,
  "deleted_at": null,
  "last_fetched_at": "2024-03-05T01:15:34.538Z",
  "config_id": 235
}
 */
export const nangoConnectionWithCredentials = z.object({
  id: z.number(),
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
  provider_config_key: z.string(),
  connection_id: z.string(),
  credentials: z.object({
    type: z.string().nullish(),
    access_token: z.string(),
    expires_at: z.string().nullish(),
    raw: z.object({
      token_type: z.string().nullish(),
      access_token: z.string().nullish(),
      expires_in: z.number().nullish(),
      expires_at: z.string().nullish(),
    }),
  }),
  connection_config: z
    .object({
      portalId: z.number().nullish(),
      instance_url: z.string().nullish(),
      /** Only exists for QBO` */
      realmId: z.string().nullish(),
    })
    .nullish(),
  metadata: z.record(z.unknown()).nullish(),
  credentials_iv: z.string().nullish(),
  credentials_tag: z.string().nullish(),
  environment_id: z.number().nullish(),
  deleted: z.boolean().nullish(),
  deleted_at: z.string().nullish(),
  last_fetched_at: z.string().nullish(),
  config_id: z.number().nullish(),
})
