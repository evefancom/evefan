// @deprecated Move this into openSDKs
/** TODO: Move this into @opensdks */
import {z} from '@opensdks/util-zod'

export const NANGO_API_HOST = 'https://api.nango.dev'

export const zNangoError = z.object({
  error: z.object({
    message: z.string(),
    code: z.union([z.literal('unknown_provider_config'), z.string()]),
    payload: z.object({}).passthrough(),
  }),
})

export const zNangoOauthConnectParams = z
  .object({
    provider_config_key: z.string(),
    connection_id: z.string(),
    public_key: z.string(),
  })
  .passthrough()

export function buildNangoConnectUrl({
  provider_config_key,
  ...params
}: z.infer<typeof zNangoOauthConnectParams>) {
  // http://localhost:3000/connect?displayName=Spendoso&connectorConfigId=int_qbo&token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2OTgwODM2NjgsInJvbGUiOiJlbmRfdXNlciIsInN1YiI6Im9yZ18yUEk1VU42ZDRVMTdlOHpYaTFLdDloYzg4dnMvc3BlbmRvc28tdGVzdGVyIiwiZW5kX3VzZXJfaWQiOiJzcGVuZG9zby10ZXN0ZXIiLCJvcmdfaWQiOiJvcmdfMlBJNVVONmQ0VTE3ZTh6WGkxS3Q5aGM4OHZzIiwiaWF0IjoxNjk4MDgwMDY4fQ.GNFK71PloX0LkWQ3RCaWN6KCENSQtiXwvopfQk6ymB4
  const url = new URL(`/oauth/connect/${provider_config_key}`, NANGO_API_HOST)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, `${value}`)
  }
  return url.toString()
}

export const zNangoOauthCallbackMessage = z.discriminatedUnion('eventType', [
  z.object({
    eventType: z.literal('AUTHORIZATION_SUCEEDED'),
    data: z.object({providerConfigKey: z.string(), connectionId: z.string()}),
  }),
  z.object({
    eventType: z.literal('AUTHORIZATION_FAILED'),
    data: z.object({authErrorDesc: z.string(), authErrorType: z.string()}),
  }),
])

export function parseNangoOauthCallbackPage(html: string) {
  const parseStrVar = (name: string) =>
    html
      .match(new RegExp(`${name.replace('.', '.')} = (?:'|\`|")(.*)`))?.[1]
      ?.replace(/('|`|");?$/, '')

  const eventType = parseStrVar('message.eventType')

  const authErrorType = parseStrVar('window.authErrorType')
  const authErrorDesc = parseStrVar('window.authErrorDesc')

  const providerConfigKey = parseStrVar('window.providerConfigKey')
  const connectionId = parseStrVar('window.connectionId')

  const res = zNangoOauthCallbackMessage.safeParse({
    eventType,
    data: {providerConfigKey, connectionId, authErrorDesc, authErrorType},
  })
  return res.success ? res.data : undefined
}

export const NangoConnect = {
  getOauthConnectUrl: async ({
    redirect_uri,
    ...params
  }: {redirect_uri?: string} & z.infer<typeof zNangoOauthConnectParams>) => {
    const res = await fetch(buildNangoConnectUrl(params), {
      redirect: 'manual',
    })
    const location = res.headers.get('location')
    if (res.status !== 302 || !location) {
      throw new Error('Missing redirect from nango /oauth/connect response')
    }
    const url = new URL(location)
    if (redirect_uri) {
      url.searchParams.set('redirect_uri', redirect_uri)
    }
    return url.toString()
  },
  doOauthCallback: async (
    params: Record<string, string | string[] | undefined>,
  ) => {
    const url = new URL('/oauth/callback', NANGO_API_HOST)
    for (const [key, value] of Object.entries(params)) {
      const arr = Array.isArray(value) ? value : value != null ? [value] : []
      for (const v of arr) {
        url.searchParams.append(key, v)
      }
    }
    const res = await fetch(url.toString(), {redirect: 'manual'})
    const htmlBody = await res.text()
    return parseNangoOauthCallbackPage(htmlBody)
  },
}
