import type {ConnectorDef, ConnectorSchemas} from '@openint/cdk'
import {connHelpers, makePostingsMap, zWebhookInput} from '@openint/cdk'
import {A, parseMoney, z} from '@openint/util'
import {
  accountItemSchema,
  transactionBrickSchema,
  zOneBrickConfig,
} from './OneBrickClient'

const connectInputSchema = z.object({
  publicToken: z.string().nullish(),
  redirect_url: z.string().nullish(),
})

export const onebrickSchemas = {
  name: z.literal('onebrick'),
  connectorConfig: zOneBrickConfig,
  resourceSettings: z.object({accessToken: z.string()}),
  connectInput: connectInputSchema,
  connectOutput: z.object({
    publicToken: z.string(),
  }),
  sourceOutputEntity: z.discriminatedUnion('entityName', [
    z.object({
      id: z.string(),
      entityName: z.literal('account'),
      entity: accountItemSchema,
    }),
    z.object({
      id: z.string(),
      entityName: z.literal('transaction'),
      entity: transactionBrickSchema,
    }),
  ]),
  webhookInput: zWebhookInput,
} satisfies ConnectorSchemas

export const helpers = connHelpers(onebrickSchemas)

export const oneBrickDef = {
  name: 'onebrick',
  schemas: onebrickSchemas,
  metadata: {verticals: ['banking'], logoUrl: '/_assets/logo-onebrick.png'},
  standardMappers: {
    entity: (data) => {
      if (data.entityName === 'account') {
        const a = data.entity
        return {
          id: a.accountId,
          entityName: 'account',
          entity: {
            name: a.accountHolder,
            type: 'asset/digital_wallet',
            integrationName: a.type,
            informationalBalances: {
              current: A(
                parseMoney((a.balances.current ?? 0).toString()),
                a.currency.toUpperCase(),
              ),
            },
            defaultUnit: a.currency as Unit,
          },
        }
      }
      if (data.entityName === 'transaction') {
        const t = data.entity
        return {
          id: t.reference_id,
          entityName: 'transaction',
          entity: {
            date: t.date,
            description: data.entity.description,
            externalCategory: data.entity.category.category_name,
            // TODO: Check how merchant_id maps to payee
            postingsMap: makePostingsMap({
              main: {
                accountExternalId: data.entity.account_id as ExternalId,
                amount: A(
                  data.entity.amount * (t.direction === 'in' ? 1 : -1),
                  (data.entity.account_currency ?? 'IDR') as Unit,
                ),
              },
            }),
          },
        }
      }
      return null
    },
  },
} satisfies ConnectorDef<typeof onebrickSchemas>

export default oneBrickDef
