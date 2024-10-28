import type {SalesforceSDK} from '@opensdks/sdk-salesforce'
import {initSalesforceSDK} from '@opensdks/sdk-salesforce'
import type {ConnectorServer} from '@openint/cdk'
import type {salesforceSchemas} from './def'

export const SALESFORCE_API_VERSION = '59.0'

export const salesforceServer = {
  newInstance: ({fetchLinks, settings}) => {
    const sdk = initSalesforceSDK({
      baseUrl: `${settings.oauth.connection_config?.instance_url}/services/data/v${SALESFORCE_API_VERSION}`,
      links: (defaultLinks) => [...fetchLinks, ...defaultLinks],
    })
    // Would be nice if this method was in the salesforce-provider-jsforce file
    return sdk
    // async function getJsForce() {
    //   if (!creds.instance_url || !creds.access_token) {
    //     throw new Error('Missing instance_url or access_token')
    //   }
    //   const conn = new jsforce.Connection({
    //     instanceUrl: creds.instance_url,
    //     accessToken: creds.access_token,
    //     version: SALESFORCE_API_VERSION,
    //     maxRequest: 10,
    //   })
    //   return conn
    // }
    // return {...sdk, getJsForce} satisfies SalesforceSDK
  },
  passthrough: (instance, input) =>
    instance.request(input.method, input.path, {
      headers: input.headers as Record<string, string>,
      params: {query: input.query},
      body: JSON.stringify(input.body),
    }),
} satisfies ConnectorServer<typeof salesforceSchemas, SalesforceSDK>

export default salesforceServer
