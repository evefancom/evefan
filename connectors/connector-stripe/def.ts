import type {StripeSDKTypes} from '@opensdks/sdk-stripe'
import type {ConnectorDef, ConnectorSchemas} from '@openint/cdk'
import {connHelpers, makePostingsMap, zCcfgAuth} from '@openint/cdk'
import {A, z, zCast} from '@openint/util'

type components = StripeSDKTypes['oas']['components']

export const stripeSchemas = {
  name: z.literal('stripe'),
  connectorConfig: zCcfgAuth.oauthOrApikeyAuth,
  resourceSettings: z.object({secretKey: z.string()}),
  sourceOutputEntity: z.discriminatedUnion('entityName', [
    z.object({
      id: z.string(),
      entityName: z.literal('account'),
      entity: zCast<components['schemas']['account']>(),
    }),
    z.object({
      id: z.string(),
      entityName: z.literal('transaction'),
      entity: zCast<components['schemas']['balance_transaction']>(),
    }),
  ]),
  sourceState: z
    .object({
      /** Account ids to sync */
      accountIds: z.array(z.string()).nullish(),
      /** Date to sync since */
      sinceDate: z.string().nullish() /** ISO8601 */,
      transactionSyncCursor: z.string().nullish(),
    })
    .default({}),
} satisfies ConnectorSchemas

export const stripeDef = {
  schemas: stripeSchemas,
  name: 'stripe',
  metadata: {
    verticals: ['commerce'],
    logoUrl: '/_assets/logo-stripe.png',
    stage: 'beta',
  },
  standardMappers: {
    entity: {
      account: ({entity: a}) => ({
        id: a.id,
        entityName: 'account',
        entity: {
          name: a.settings?.dashboard.display_name ?? '',
          type: 'asset/digital_wallet',
          integrationName: a.settings?.payments.statement_descriptor,
          defaultUnit: a.default_currency?.toUpperCase() as Unit,
          // informationalBalances: {
          //   available: A(
          //     a.balance?.available[0]?.amount ?? 0,
          //     a.default_currency?.toUpperCase() as Unit,
          //   ),
          // },
        },
      }),
      transaction: ({entity: t}) => ({
        id: t.id,
        entityName: 'transaction',
        entity: {
          date: new Date(t.created).toISOString(),
          description: t.description ?? '',
          postingsMap: makePostingsMap({
            main: {
              accountExternalId: t.source as ExternalId,
              amount: A(t.amount, t.currency as Unit),
            },
          }),
        },
      }),
    },
  },
} satisfies ConnectorDef<typeof stripeSchemas>

export const helpers = connHelpers(stripeSchemas)

export default stripeDef
