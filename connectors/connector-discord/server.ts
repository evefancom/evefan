import type {ConnectorServer} from '@openint/cdk'
import type {discordSchemas} from './def'

export const discordServer = {} satisfies ConnectorServer<typeof discordSchemas>

export default discordServer
