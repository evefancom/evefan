import type {AdapterMap} from '@openint/vdk'
import {hubspotAdapter} from './adapters/hubspot-adapter'
import {msDynamics365SalesAdapter} from './adapters/ms-dynamics-365-sales-adapter'
import {pipedriveAdapter} from './adapters/pipedrive-adapter'
import {salesforceAdapter} from './adapters/salesforce-adapter'

export * from './adapters/hubspot-adapter'
export * from './adapters/ms-dynamics-365-sales-adapter'
export * from './adapters/pipedrive-adapter'
export * from './adapters/salesforce-adapter'
export * from './router'

export default {
  hubspot: hubspotAdapter,
  salesforce: salesforceAdapter,
  pipedrive: pipedriveAdapter,
  ms_dynamics_365_sales: msDynamics365SalesAdapter,
} satisfies AdapterMap
