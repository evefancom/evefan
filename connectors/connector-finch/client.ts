/** Used for the side effect of window.FinchConnect */
import type {useFinchConnect} from '@tryfinch/react-connect'
import type {ConnectorClient} from '@openint/cdk'
import {CANCELLATION_TOKEN, useScript} from '@openint/cdk'
import type {finchSchemas} from './def'

declare global {
  interface Window {
    FinchConnect: {initialize: typeof useFinchConnect}
  }
}

export const finchClient = {
  useConnectHook: () => {
    const scriptLoaded = useScript(
      'https://prod-cdn.tryfinch.com/v1/connect.js',
    )

    // TODO: Improve the useConnectHook api with a separate "prefetch" vs "open" fn
    // To take into account the fact that we can initialize the link eagerly
    return ({client_id, products}) =>
      new Promise(async (resolve, reject) => {
        await scriptLoaded
        const connect = window.FinchConnect.initialize({
          clientId: client_id,
          products,
          sandbox: 'finch',
          onSuccess(res) {
            console.log('[FinchConnect] onSuccess', res.code)
            resolve(res)
          },
          onError: (error) => {
            console.log('[FinchConnect] onValidationError', error)
            reject(error.errorMessage)
          },
          onClose() {
            console.log('[FinchConnect] onClose')
            reject(CANCELLATION_TOKEN)
          },
        })

        connect.open()
      })
  },
} satisfies ConnectorClient<typeof finchSchemas>

export default finchClient
