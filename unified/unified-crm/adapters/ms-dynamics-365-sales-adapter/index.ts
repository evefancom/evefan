import {type PipedriveSDK} from '@opensdks/sdk-pipedrive'
import {NotImplementedError} from '@openint/vdk'
import type {CRMAdapter} from '../../router'
import {MS_DYNAMICS_365_SALES_STANDARD_OBJECTS} from './constants'

export const msDynamics365SalesAdapter = {
  // __init__: ({proxyLinks}) =>
  //   // FIXME: This is a placeholder, we need an actual msdynamics sdk!
  //   initPipedriveSDK({
  //     baseUrl: PLACEHOLDER_BASE_URL,
  //     headers: {authorization: 'Bearer ...'}, // This will be populated by Nango, or you can populate your own...
  //     links: (defaultLinks) => [...proxyLinks, ...defaultLinks],
  //   }),
  // eslint-disable-next-line @typescript-eslint/require-await
  getAccount: async ({}) => {
    throw new Error('Not implemented yet')
  },
  metadataListObjects: ({input}) => {
    if (input.type === 'custom') {
      throw new NotImplementedError(
        'MS Dynamics 365 Sales does not support custom objects yet',
      )
    }
    return MS_DYNAMICS_365_SALES_STANDARD_OBJECTS.map((name) => ({
      id: name,
      name,
    }))
  },
} satisfies CRMAdapter<PipedriveSDK>
