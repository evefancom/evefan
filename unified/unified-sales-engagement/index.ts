import type {AdapterMap} from '@openint/vdk'
import {apolloAdapter} from './adapters/apollo-adapter'
import {outreachAdapter} from './adapters/outreach-adapter'
import {salesloftAdapter} from './adapters/salesloft-adapter'

export * from './adapters/apollo-adapter'
export * from './adapters/outreach-adapter'
export * from './adapters/salesloft-adapter'
export * from './router'

export default {
  apollo: apolloAdapter,
  salesloft: salesloftAdapter,
  outreach: outreachAdapter,
} satisfies AdapterMap
