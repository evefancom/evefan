import type {AdapterMap} from '@openint/vdk'
import {apolloAdapter} from './apollo-adapter'
import {outreachAdapter} from './outreach-adapter'
import {salesloftAdapter} from './salesloft-adapter'

export default {
  apollo: apolloAdapter,
  salesloft: salesloftAdapter,
  outreach: outreachAdapter,
} satisfies AdapterMap
