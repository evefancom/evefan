import type {AdapterMap} from '@openint/vdk'
import {hubspotAdapter} from './hubspot-adapter'
import {msDynamics365SalesAdapter} from './ms-dynamics-365-sales-adapter'
import {pipedriveAdapter} from './pipedrive-adapter'
import {salesforceAdapter} from './salesforce-adapter'

export default {
  hubspot: hubspotAdapter,
  salesforce: salesforceAdapter,
  pipedrive: pipedriveAdapter,
  ms_dynamics_365_sales: msDynamics365SalesAdapter,
} satisfies AdapterMap
