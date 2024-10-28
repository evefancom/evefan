import type {ConnectorDef, ConnectorSchemas} from '@openint/cdk'
import {connHelpers, makePostingsMap} from '@openint/cdk'
import {A, parseMoney, R, z} from '@openint/util'
import {
  assetSchema,
  categorySchema,
  transactionSchema,
  zConfig,
} from './lunchmoneyClient'

export const lunchmoneySchemas = {
  name: z.literal('lunchmoney'),
  connectorConfig: zConfig,
  sourceOutputEntity: z.discriminatedUnion('entityName', [
    z.object({
      id: z.string(),
      entityName: z.literal('account'),
      entity: z.discriminatedUnion('_type', [
        assetSchema.extend({_type: z.literal('asset')}),
        categorySchema.extend({_type: z.literal('category')}),
      ]),
    }),
    z.object({
      id: z.string(),
      entityName: z.literal('transaction'),
      entity: transactionSchema,
    }),
  ]),
} satisfies ConnectorSchemas

export const lunchmoneyHelpers = connHelpers(lunchmoneySchemas)

export const lunchmoneyDef = {
  name: 'lunchmoney',
  schemas: lunchmoneySchemas,
  metadata: {verticals: ['personal-finance'],
    logoUrl: '/_assets/logo-lunchmoney.svg',
  },
  standardMappers: {
    entity: {
      account: ({entity: a}) => ({
        id: `${a.id}`,
        entityName: 'account',
        entity:
          a._type === 'asset'
            ? {
                name: R.compact([a.display_name, a.name]).join(' '),
                integrationName: a.institution_name,
                informationalBalances: {
                  current: A(parseMoney(a.balance), a.currency.toUpperCase()),
                },
                type: (() => {
                  switch (a.subtype_name) {
                    case 'brokerage':
                      return 'asset/brokerage'
                    // TODO: Add more types from LunchMoney
                    default:
                      return 'asset'
                  }
                })(),
              }
            : {
                name: a.name,
                type: a.is_income ? 'income' : 'expense',
              },
      }),
      transaction: ({entity: t}) => ({
        id: `${t.id}`,
        entityName: 'transaction',
        entity: {
          date: t.date,
          // TODO: Verify this logic is correct in a general case.
          // @see https://share.cleanshot.com/TmXwqa
          description:
            t.payee && t.payee !== t.original_name ? '' : t.original_name,
          payee: t.payee,
          notes: t.notes,
          postingsMap: makePostingsMap({
            main: {
              accountExternalId: `${
                t.asset_id ?? t.plaid_account_id
              }` as ExternalId,
              amount: A(parseMoney(t.amount), t.currency.toUpperCase()),
            },
            remainder: {
              accountExternalId: `${t.category_id}` as ExternalId,
              // TODO: Make this logic better, shouldn't infer something is `main` just because it has external id
              type: 'category',
            },
          }),
        },
      }),
    },
  },
} satisfies ConnectorDef<typeof lunchmoneySchemas>

export default lunchmoneyDef
