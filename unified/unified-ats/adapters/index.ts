import type {AdapterMap} from '@openint/vdk'
import {greenhouseAdapter} from './greenhouse-adapter'
import {leverAdapter} from './lever-adapter'

export default {
  lever: leverAdapter,
  greenhouse: greenhouseAdapter,
} satisfies AdapterMap
