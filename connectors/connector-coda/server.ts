import type {CodaSDK} from '@opensdks/sdk-coda'
import {initCodaSDK} from '@opensdks/sdk-coda'
import type {ConnectorServer} from '@openint/cdk'
import type {codaSchemas} from './def'

export const codaServer = {
  newInstance({settings}) {
    return initCodaSDK({headers: {Authorization: `Bearer ${settings.apiKey}`}})
  },

  async proxy(instance, req) {
    return instance
      .request(req.method as 'GET', req.url.replace(/.+\/api\/proxy/, ''), {
        headers: req.headers,
        ...(!['GET', 'OPTIONS', 'HEAD'].includes(req.method) && {
          body: await req.blob(), // See if this works... We need to figure out how to do streaming here...
        }),
      })
      .then((r) => r.response.clone())
  },

  passthrough(instance, input) {
    const headers = new Headers(input.headers as Record<string, string>)
    headers.delete('authorization') // Do not allow this to be overwritten
    return instance.request(input.method, input.path, {
      headers,
      params: {query: input.query},
      body: JSON.stringify(input.body),
    })
  },
} satisfies ConnectorServer<typeof codaSchemas, CodaSDK>

export default codaServer
