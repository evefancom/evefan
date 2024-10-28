import type {ConnectorClient} from '@openint/cdk'
import {CANCELLATION_TOKEN, DivContainer, useScript} from '@openint/cdk'
import type {NonDiscriminatedUnion} from '@openint/util'
import type {yodleeSchemas} from './def'
import type {FastLinkOpenOptions} from './fastlink'

const YODLEE_CONTAINER_ID = 'yodlee-container'

export const yodleeClientConnector = {
  useConnectHook: (scope) => {
    const loaded = useScript('//cdn.yodlee.com/fastlink/v4/initialize.js')
    return async (
      {accessToken, envName},
      {
        resourceExternalId: providerAccountId,
        integrationExternalId: providerId,
      },
    ) => {
      console.log('[yodlee] connect', {
        accessToken,
        envName,
        providerId,
        providerAccountId,
      })
      await loaded

      console.log('[yodlee] script loaded, will open dialog')

      return new Promise((resolve, reject) => {
        scope.openDialog(({close}) => {
          const openOptions: FastLinkOpenOptions = {
            fastLinkURL: {
              sandbox:
                'https://fl4.sandbox.yodlee.com/authenticate/restserver/fastlink',
              development:
                'https://fl4.preprod.yodlee.com/authenticate/development-75/fastlink/?channelAppName=tieredpreprod',
              production:
                'https://fl4.prod.yodlee.com/authenticate/production-148/fastlink/?channelAppName=tieredprod',
            }[envName],
            accessToken: `Bearer ${accessToken.accessToken}`,
            forceIframe: true,
            params: {
              configName: 'Aggregation',
              ...(providerAccountId
                ? {flow: 'edit', providerAccountId}
                : providerId
                  ? {flow: 'add', providerId}
                  : undefined),
            },
            onSuccess: (data) => {
              console.debug('[yodlee] Did receive successful response', data)
              close()
              resolve({
                providerAccountId: data.providerAccountId,
                providerId: data.providerId,
              })
            },
            onError: (_data) => {
              console.warn('[yodlee] Did receive an error', _data)
              const data = _data as NonDiscriminatedUnion<typeof _data>
              close()
              reject(new Error(data.reason ?? data.message))
            },
            onClose: (data) => {
              console.log('[yodlee] Did close', data)
              close()
              reject(CANCELLATION_TOKEN)
            },
            onEvent: (data) => {
              console.log('[yodlee] event', data)
            },
          }
          console.log('[yodlee] Open options', openOptions)
          return DivContainer({
            id: YODLEE_CONTAINER_ID,
            onMount: () =>
              window.fastlink?.open(openOptions, YODLEE_CONTAINER_ID),
            onUnmount: () => window.fastlink?.close(),
          })
        })
      })
    }
  },
} satisfies ConnectorClient<typeof yodleeSchemas>

export default yodleeClientConnector
