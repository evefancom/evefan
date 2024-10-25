import type {ConnectorDef, ConnectorSchemas} from '@openint/cdk'
import {connHelpers, makePostingsMap, zCcfgAuth} from '@openint/cdk'
import {A, R, z} from '@openint/util'
import {
  businessResponseSchema,
  transactionResponseItemSchema,
} from './RampClient'

export const rampSchemas = {
  name: z.literal('ramp'),
  connectorConfig: zCcfgAuth.oauth,
  resourceSettings: z.object({
    accessToken: z.string().nullish(),
    startAfterTransactionId: z.string().nullish(),
  }),
  connectInput: z.object({
    accessToken: z.string().nullish(),
  }),
  connectOutput: z.object({
    accessToken: z.string().nullish(),
    clientId: z.string().nullish(),
    clientSecret: z.string().nullish(),
  }),
  sourceOutputEntity: z.discriminatedUnion('entityName', [
    z.object({
      id: z.string(),
      entityName: z.literal('account'),
      entity: businessResponseSchema,
    }),
    z.object({
      id: z.string(),
      entityName: z.literal('transaction'),
      entity: transactionResponseItemSchema,
    }),
  ]),
  sourceState: z.object({
    startAfterTransactionId: z.string().nullish(),
    accessToken: z.string().nullish(),
    clientId: z.string().nullish(),
    clientSecret: z.string().nullish(),
  }),
} satisfies ConnectorSchemas

export const rampHelpers = connHelpers(rampSchemas)

export const rampDef = {
  name: 'ramp',
  schemas: rampSchemas,
  metadata: {
    verticals: ['banking', 'expense-management'],
    logoUrl: '/_assets/logo-ramp.png',
    stage: 'beta',
  },
  standardMappers: {
    entity: {
      account: ({entity: a}) => ({
        id: a.id,
        entityName: 'account',
        entity: {
          name: `${a.business_name_on_card}`,
          type: 'asset/bank',
          integrationName: a.business_name_legal,
        },
      }),
      transaction: ({entity: t}) => ({
        id: t.id,
        entityName: 'transaction',
        entity: {
          date: t.user_transaction_time,
          description: t.merchant_descriptor ?? '',
          payee: t.merchant_name,
          externalCategory: t.sk_category_name ?? '',
          postingsMap: makePostingsMap({
            main: {
              amount: A(-1 * t.amount, 'USD' as Unit),
              memo:
                t.memo ??
                R.compact([
                  `${t.card_holder.first_name} ${t.card_holder.last_name}`,
                  t.merchant_category_code,
                ]).join('/'),
              subAccountKey: t.state.toLowerCase() ?? undefined,
            },
          }),
          custom: {
            user: `${t.card_holder.first_name} ${t.card_holder.last_name}`,
          },
        },
      }),
    },
  },
} satisfies ConnectorDef<typeof rampSchemas>

export default rampDef
