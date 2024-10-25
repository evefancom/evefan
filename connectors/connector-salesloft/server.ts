import type {SalesloftSDK} from '@opensdks/sdk-salesloft'
import {initSalesloftSDK} from '@opensdks/sdk-salesloft'
import type {ConnectorServer} from '@openint/cdk'
import type {salesloftSchemas} from './def'

export const salesloftServer = {
  newInstance: ({settings, fetchLinks}) => {
    const sdk = initSalesloftSDK({
      // We rely on nango to refresh the access token...
      headers: {
        authorization: `Bearer ${settings.oauth.credentials.access_token}`,
      },
      links: (defaultLinks) => [...fetchLinks, ...defaultLinks],
    })
    return sdk
  },
  passthrough: (instance, input) =>
    instance.request(input.method, input.path, {
      headers: input.headers as Record<string, string>,
      params: {query: input.query},
      body: JSON.stringify(input.body),
    }),
} satisfies ConnectorServer<typeof salesloftSchemas, SalesloftSDK>

export default salesloftServer
