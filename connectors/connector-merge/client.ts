/** Used for the side effect of window.MergeLink */
import type {UseMergeLinkProps} from '@mergeapi/react-merge-link/dist/types'
import type {ConnectorClient} from '@openint/cdk'
import {CANCELLATION_TOKEN, useScript} from '@openint/cdk'
import type {mergeSchemas} from './def'

export const mergeClient = {
  useConnectHook: () => {
    const scriptLoaded = useScript('https://cdn.merge.dev/initialize.js')

    // TODO: Improve the useConnectHook api with a separate "prefetch" vs "open" fn
    // To take into account the fact that we can initialize the link eagerly
    return ({link_token}) =>
      new Promise(async (resolve, reject) => {
        await scriptLoaded

        const options = {
          shouldSendTokenOnSuccessfulLink: true,
          // Will need to be passed into both initialize and openLink
          // otherwise will not open the oauth dialog
          linkToken: link_token,
          onSuccess(publicToken, additionalInfo) {
            console.log('[MergeLink] onSuccess', publicToken, additionalInfo)
            resolve({publicToken})
          },
          onValidationError: (error) => {
            console.log('[MergeLink] onValidationError', error)
            reject(error)
          },
          onExit() {
            console.log('[MergeLink] onExit')
            reject(CANCELLATION_TOKEN)
          },
        } satisfies UseMergeLinkProps
        await new Promise<void>((_resolve) => {
          window.MergeLink.initialize({
            ...options,
            onReady: () => {
              console.log('[MergeLink] onReady')
              _resolve()
            },
          })
        })
        window.MergeLink.openLink(options)
      })
  },
} satisfies ConnectorClient<typeof mergeSchemas>

export default mergeClient
