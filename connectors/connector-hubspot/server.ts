import {initHubspotSDK, type HubspotSDK} from '@opensdks/sdk-hubspot'
import type {ConnectorServer} from '@openint/cdk'
import type {hubspotSchemas} from './def'

export const hubspotServer = {
  newInstance: ({fetchLinks, settings}) =>
    initHubspotSDK({
      headers: {
        authorization: `Bearer ${settings.oauth.credentials.access_token}`,
      },
      links: (defaultLinks) => [...fetchLinks, ...defaultLinks],
    }),

  checkResource: async ({instance, settings}) => {
    // Fix me hubspot workaround ....
    // https://developers.hubspot.com/docs/api/settings/account-information-api
    const res = await instance!.crm_objects.request(
      'GET',
      '/account-info/v3/details',
      {},
    )
    // https://legacydocs.hubspot.com/docs/methods/get-account-details
    const res2 = await instance!.crm_objects.request(
      'GET',
      '/integrations/v1/me',
      {},
    )
    // https://community.hubspot.com/t5/APIs-Integrations/Get-HubsPot-account-name-by-portalId-from-API/m-p/280013
    const res3 = await instance!.auth_oauth.GET('/v1/access-tokens/{token}', {
      params: {path: {token: settings.oauth.credentials.access_token!}},
    })
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return {
      settings: {
        extra: {accountInfo: res.data, me: res2.data, tokenInfo: res3.data},
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any
  },

  // passthrough: (instance, input) =>
  //   instance.request(input.method, input.path, {
  //     headers: input.headers as Record<string, string>,
  //     params: {query: input.query},
  //     body: JSON.stringify(input.body),
  //   }),
} satisfies ConnectorServer<typeof hubspotSchemas, HubspotSDK>

export default hubspotServer
