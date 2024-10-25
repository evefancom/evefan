import type {AdapterMap} from '@openint/vdk'
import * as revert from './revert-adapter'

export default {
  revert: revert.default,
} satisfies AdapterMap
