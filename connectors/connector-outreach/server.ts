import type {OutreachSDK} from '@opensdks/sdk-outreach'
import {initOutreachSDK} from '@opensdks/sdk-outreach'
import type {ConnectorServer} from '@openint/cdk'
import type {outreachSchemas} from './def'

export const outreachServer = {
  newInstance: ({settings, fetchLinks}) => {
    const sdk = initOutreachSDK({
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
} satisfies ConnectorServer<typeof outreachSchemas, OutreachSDK>

export default outreachServer
