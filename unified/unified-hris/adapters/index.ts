import type {AdapterMap} from '@openint/vdk'
import {finchAdapter} from './finch-adapter'

export default {
  finch: finchAdapter,
} satisfies AdapterMap
