import type {AdapterMap} from '@openint/vdk'
import {qboAdapter} from './qbo-adapter'

export default {
  qbo: qboAdapter,
} satisfies AdapterMap
