import admin from 'firebase-admin'
import {implementProxyFn} from '@openint/util'
import {$admin} from './server'

implementProxyFn($admin, () => admin)
