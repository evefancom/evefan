import type {ConnectorServer} from '@openint/cdk'
import {logLink} from '@openint/cdk'
import {rxjs} from '@openint/util'
import type {debugSchemas} from './def'

export const debugServer = {
  sourceSync: () => rxjs.EMPTY,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  destinationSync: () => logLink<any>({prefix: 'debug', verbose: true}),
  handleWebhook: (input) => ({
    resourceUpdates: [],
    response: {body: {echo: input}},
  }),
} satisfies ConnectorServer<typeof debugSchemas>

export default debugServer
