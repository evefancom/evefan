import type {ConnectorDef, ConnectorSchemas} from '@openint/cdk'
import {connHelpers, zEntityPayload} from '@openint/cdk'
import type {Brand} from '@openint/util'
import {A, DateTime, z, zCast} from '@openint/util'
import {
  descriptionFromTransaction,
  payeeFromTransaction,
  postingsFromTransaction,
} from './venmo-helpers'
import {zConfig} from './VenmoClient'

// Venmo appears to only support USD for now
const VENMO_CURR = 'USD' as Unit

const zSettings = z.object({
  me: zCast<Venmo.GetCurrentUserData>(),
  // TODO: Store venmo credentials inside VGS rather than own db
  credentials: zCast<Venmo.Credentials>(),
})

export const venmoSchemas = {
  name: z.literal('venmo'),
  connectorConfig: zConfig,
  resourceSettings: zSettings,
  sourceOutputEntity: z.discriminatedUnion('entityName', [
    z.object({
      id: z.string(),
      entityName: z.literal('account'),
      entity: zCast<Venmo.GetCurrentUserData>(),
    }),
    z.object({
      id: z.string(),
      entityName: z.literal('transaction'),
      entity: zCast<Venmo.Transaction & {_currentUserId: string}>(),
    }),
  ]),
  destinationInputEntity: zEntityPayload,
} satisfies ConnectorSchemas

export const helpers = connHelpers(venmoSchemas)

export const venmoDef = {
  name: 'venmo',
  schemas: venmoSchemas,
  metadata: {verticals: ['banking'], logoUrl: '/_assets/logo-venmo.png'},
  standardMappers: {
    entity: {
      account: ({entity: a}, _extConn) => ({
        id: a.user.id,
        entityName: 'account',
        entity: {
          name: `Venmo (${a.user.username})`,
          informationalBalances: {
            current: A(Number.parseInt(a.balance, 10), VENMO_CURR),
          },
          lastFour: a.user.username,
          type: 'asset/digital_wallet',
        },
      }),
      transaction: ({entity: t}, extConn) => ({
        id: t.id,
        entityName: 'transaction',
        entity: {
          date: DateTime.fromISO(t.datetime_created).toISODate(),
          description: descriptionFromTransaction(t),
          payee: payeeFromTransaction(
            t,
            extConn.me.user.id ?? t._currentUserId,
          ),
          postingsMap: postingsFromTransaction(
            t,
            extConn.me.user.id ?? t._currentUserId,
          ),
          externalStatus: t.transfer?.status as Brand<string, 'externalStatus'>,
        },
      }),
    },
  },
} satisfies ConnectorDef<typeof venmoSchemas>

export default venmoDef
