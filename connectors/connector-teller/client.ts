import type {ConnectorClient} from '@openint/cdk'
import {useScript} from '@openint/cdk'
import type {tellerSchemas} from './def'

export const tellerClient = {
  useConnectHook: (_) => {
    const loaded = useScript('//cdn.teller.io/connect/connect.js')
    return async (opts, {integrationExternalId}) => {
      await loaded
      const integration = integrationExternalId
        ? `${integrationExternalId}`
        : undefined
      return new Promise((resolve, reject) => {
        const tellerConnect = window.TellerConnect.setup({
          applicationId: opts.applicationId,
          ...(integration && {integration}),
          onInit() {
            console.log('Teller Connect has initialized')
          },
          // Part 3. Handle a successful enrollment's accessToken
          onSuccess(enrollment) {
            console.log('User enrolled successfully', enrollment)
            resolve({token: enrollment.accessToken})
          },
          onFailure(failure) {
            console.error('User enrolled failed', failure)
            reject(new Error(failure.message))
          },
          onExit() {
            console.log('User closed Teller Connect')
          },
        })
        tellerConnect.open()
      })
    }
  },
} satisfies ConnectorClient<typeof tellerSchemas>

export default tellerClient
