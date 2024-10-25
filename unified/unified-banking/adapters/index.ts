import type {AdapterMap} from '@openint/vdk'
import * as plaid from './plaid-adapter'
import * as qbo from './qbo-adapter'
import * as xero from './xero-adapter'

export {plaid, qbo, xero}

export default {
  qbo: qbo.qboAdapter,
  xero: xero.xeroAdapter,
  plaid: plaid.plaidAdapter,
} satisfies AdapterMap
