import type {ConnectorServer} from '@openint/cdk'
import {handlersLink} from '@openint/cdk'
import {createHTTPClient, rxjs} from '@openint/util'
import type {webhookHelpers, webhookSchemas} from './def'

export const webhookServer = {
  destinationSync: ({settings: {destinationUrl}}) => {
    const http = createHTTPClient({baseURL: destinationUrl})
    let batch = {
      resUpdates: [] as unknown[],
      stateUpdates: [] as unknown[],
      entities: [] as Array<
        (typeof webhookHelpers)['_types']['destinationInputEntity']
      >,
    }

    return handlersLink({
      data: (op) => {
        batch.entities.push(op.data)
        return rxjs.of(op)
      },
      resoUpdate: (op) => {
        batch.resUpdates.push(op)
        return rxjs.of(op)
      },
      stateUpdate: (op) => {
        batch.stateUpdates.push(op)
        return rxjs.of(op)
      },
      commit: async (op) => {
        if (Object.values(batch).some((arr) => arr.length > 0)) {
          await http.post('', batch)
          // Add queuing and retries here...
          batch = {resUpdates: [], stateUpdates: [], entities: []}
        }
        return op
      },
    })
  },
} satisfies ConnectorServer<typeof webhookSchemas>

export default webhookServer
