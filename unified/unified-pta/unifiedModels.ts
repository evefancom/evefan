import {zObject} from '@openint/util'
import type * as Pta from './pta-types'

export const account = zObject<Pta.Account>()
// .openapi({format: 'prefix:acct'}),
export const transaction = zObject<Pta.Transaction>()
// .openapi({format: 'prefix:exp'}),
export const commodity = zObject<Pta.Commodity>()
// .openapi({format: 'prefix:ven'}),
