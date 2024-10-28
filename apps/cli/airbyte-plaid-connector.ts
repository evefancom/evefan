import '@openint/app-config/register.node'
import {plaidProvider} from '@openint/connector-plaid'
import {makeAirbyteConnector} from '@openint/meta-service-airbyte/makeAirbyteConnector'
import {cliFromRouter} from './cli-utils'

cliFromRouter(makeAirbyteConnector(plaidProvider), {
  jsonOutput: true,
  consoleLog: false,
  readStdin: false,
}).parse(process.argv)
