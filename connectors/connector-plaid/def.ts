import plaidOas from '@opensdks/sdk-plaid/plaid.oas.json'
import type * as plaid from 'plaid'
import type {PlaidError} from 'plaid'
import {CountryCode, Products} from 'plaid'
import type {
  PlaidAccount as PlaidLinkAccount,
  PlaidLinkOnSuccessMetadata,
} from 'react-plaid-link'
import type {ConnectorDef, ConnectorSchemas, OpenApiSpec} from '@openint/cdk'
import {connHelpers, makePostingsMap, zWebhookInput} from '@openint/cdk'
import {A, R, z, zCast} from '@openint/util'
import {
  getPlaidAccountBalance,
  getPlaidAccountFullName,
  getPlaidAccountType,
  plaidUnitForCurrency,
} from './legacy/plaid-helpers'
import {inferPlaidEnvFromToken} from './plaid-utils'
import type {ErrorShape} from './plaid.types'
import {zCountryCode, zLanguage, zPlaidEnvName, zProducts} from './PlaidClient'

export const plaidSchemas = {
  name: z.literal('plaid'),
  // There is a mixing of cases here... Unfortunately...
  connectorConfig: z.object({
    // TODO: Change to snake_case... then move envName variable over...
    envName: zPlaidEnvName,
    credentials: z
      .union([
        // TODO: This should be z.literal('default') but it does not render well in the UI :/
        z.null().openapi({title: 'Use OpenInt platform credentials'}),
        z
          .object({
            clientId: z.string(),
            clientSecret: z.string(),
          })
          .openapi({title: 'Use my own'}),
      ])
      .optional(),
    clientName: z
      .string()
      .max(30)
      .default('This Application')
      .describe(
        `The name of your application, as it should be displayed in Link.
        Maximum length of 30 characters.
        If a value longer than 30 characters is provided, Link will display "This Application" instead.`,
      ),
    products: z.array(zProducts).default([Products.Transactions]),
    countryCodes: z
      .array(zCountryCode)
      .default([CountryCode.Us, CountryCode.Ca]),
    /**
     * When using a Link customization, the language configured
     * here must match the setting in the customization, or the customization will not be applied.
     */
    language: zLanguage.default('en'),
  }),
  resourceSettings: z.object({
    itemId: z.string().nullish(),
    accessToken: z.string(),
    institution: zCast<plaid.Institution | undefined>(),
    item: zCast<plaid.Item | undefined>(),
    status: zCast<plaid.ItemGetResponse['status'] | undefined>(),
    /** Comes from webhook */
    webhookItemError: zCast<ErrorShape>().nullish(),
  }),
  integrationData: zCast<plaid.Institution>(),
  preConnectInput: z.object({
    ...(process.env.NODE_ENV === 'production'
      ? {}
      : // Development mode only
        {sandboxPublicTokenCreate: z.boolean().optional()}),
    language: zLanguage.optional(),
  }),
  connectInput: z.union([
    z.object({link_token: z.string()}),
    z.object({public_token: z.string()}),
  ]),
  connectOutput: z.object({
    publicToken: z.string(),
    meta: zCast<PlaidLinkOnSuccessMetadata>().optional(),
  }),
  /** "Manually" extending for now, this will get better / safer */
  sourceState: z
    .object({
      /**
       * Account ids to sync. Should this live in the stream config somehow?
       * We should keep state to only incremental sync state for future
       */
      accountIds: z.array(z.string()).nullish(),
      /** Date to sync since */
      sinceDate: z.string().nullish() /** ISO8601 */,
      transactionSyncCursor: z.string().nullish(),
      /** ISO8601 */
      investmentTransactionEndDate: z.string().nullish(),
    })
    .default({}),
  sourceOutputEntities: R.mapToObj(
    ['transaction', 'account', 'investment_transaction', 'holding'] as const,
    (e) => [e, z.unknown()],
  ),
  sourceOutputEntity: z.discriminatedUnion('entityName', [
    z.object({
      id: z.string(),
      entityName: z.literal('account'),
      entity: zCast<plaid.AccountBase | PlaidLinkAccount>(),
    }),
    z.object({
      id: z.string(),
      entityName: z.literal('transaction'),
      entity: zCast<plaid.Transaction | plaid.InvestmentTransaction>(),
    }),
  ]),
  webhookInput: zWebhookInput,

  // Temp hack... As unkonwn causes type error during sourceSync, also need .type object
  // otherwise zod-openapi does not like it https://github.com/asteasolutions/zod-to-openapi/issues/196
  destinationState: z.undefined().openapi({type: 'object'}),
} satisfies ConnectorSchemas

export const helpers = connHelpers(plaidSchemas)

export const plaidDef = {
  name: 'plaid',
  schemas: plaidSchemas,
  metadata: {
    verticals: ['banking'],
    displayName: 'Plaid',
    stage: 'ga',
    /** https://commons.wikimedia.org/wiki/File:Plaid_logo.svg */
    logoSvg:
      '<svg width="126" height="48" viewBox="0 0 126 48" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><title>Plaid logo</title><defs><path id="a" d="M0 47.473h126V0H0z"/></defs><g fill="none" fill-rule="evenodd"><path d="M66.248 16.268c-1.057-.889-2.861-1.333-5.413-1.333h-5.756v17.788h4.304v-5.575h1.928c2.34 0 4.056-.515 5.148-1.546 1.23-1.155 1.849-2.693 1.849-4.613 0-1.991-.687-3.565-2.06-4.721m-5.044 6.855h-1.821V18.96h1.636c1.99 0 2.985.698 2.985 2.094 0 1.378-.934 2.068-2.8 2.068M75.673 14.934h-4.488v17.788h9.69v-4.026h-5.202zM89.668 14.934l-7.05 17.788h4.832l.924-2.586H94.5l.845 2.586h4.886l-7-17.788h-3.563zm-.053 11.601l1.849-6.08 1.82 6.08h-3.67z" fill="#111"/><mask id="b" fill="#fff"><use xlink:href="#a"/></mask><path fill="#111" mask="url(#b)" d="M102.473 32.722h4.489V14.934h-4.489zM124.39 18.268a7.376 7.376 0 0 0-2.14-2.053c-1.355-.854-3.204-1.28-5.545-1.28h-5.914v17.787h6.918c2.5 0 4.506-.817 6.02-2.453 1.514-1.635 2.27-3.805 2.27-6.508 0-2.15-.537-3.981-1.61-5.493m-7.182 10.427h-1.927v-9.734h1.954c1.373 0 2.428.43 3.168 1.287.74.857 1.11 2.073 1.11 3.647 0 3.2-1.435 4.8-4.305 4.8M18.637 0L4.09 3.81.081 18.439l5.014 5.148L0 28.65l3.773 14.693 14.484 4.047 5.096-5.064 5.014 5.147 14.547-3.81 4.008-14.63-5.013-5.146 5.095-5.063L43.231 4.13 28.745.083l-5.094 5.063L18.637 0zM9.71 6.624l7.663-2.008 3.351 3.44-4.887 4.856L9.71 6.624zm16.822 1.478l3.405-3.383 7.63 2.132-6.227 6.187-4.808-4.936zM4.672 17.238l2.111-7.705 6.125 6.288-4.886 4.856-3.35-3.44zm29.547-1.243l6.227-6.189 1.986 7.74-3.404 3.384-4.809-4.935zm-15.502-.127l4.887-4.856 4.807 4.936-4.886 4.856-4.808-4.936zm-7.814 7.765l4.886-4.856 4.81 4.936-4.888 4.856-4.808-4.936zm15.503.127l4.886-4.856L36.1 23.84l-4.887 4.856-4.807-4.936zM4.57 29.927l3.406-3.385 4.807 4.937-6.225 6.186-1.988-7.738zm14.021 1.598l4.887-4.856 4.808 4.936-4.886 4.856-4.809-4.936zm15.502.128l4.887-4.856 3.351 3.439-2.11 7.705-6.128-6.288zm-24.656 8.97l6.226-6.189 4.81 4.936-3.406 3.385-7.63-2.133zm16.843-1.206l4.886-4.856 6.126 6.289-7.662 2.007-3.35-3.44z"/></g></svg>',
    openapiSpec: {
      proxied: plaidOas as OpenApiSpec,
    },
  },
  standardMappers: {
    entity: {
      account: ({entity: a}, extConn) => ({
        id: 'account_id' in a ? a.account_id : a.id,
        entityName: 'account',
        entity: {
          name: getPlaidAccountFullName(a, extConn.institution),
          lastFour: a.mask,
          // TODO: Map Plaid account type properly
          type: getPlaidAccountType(a),
          integrationName: extConn.institution?.name,
          informationalBalances: {
            current: getPlaidAccountBalance(a, 'current'),
            available: getPlaidAccountBalance(a, 'available'),
            limit: getPlaidAccountBalance(a, 'limit'),
          },
          defaultUnit: (('balances' in a && a.balances.iso_currency_code) ??
            undefined) as Unit | undefined,
        },
      }),
      transaction: ({entity: t}) => {
        const curr = plaidUnitForCurrency(t)
        const currencyAmount = A(-1 * (t.amount ?? 0), curr)
        const accountExternalId = t.account_id as ExternalId
        if (isInvestmentTransaction(t)) {
          return {
            id: t.investment_transaction_id,
            entityName: 'transaction',
            // TODO: Finish the mapper
            entity: {date: t.date, description: t.name},
          }
        }

        const externalCategory = t.category?.join('/')
        return {
          id: t.transaction_id,
          entityName: 'transaction',
          entity: {
            date: t.date,
            pendingTransactionExternalId:
              t.pending_transaction_id as ExternalId | null,
            description: t.name || '',
            payee: t.merchant_name ?? undefined,
            postingsMap: makePostingsMap({
              main: {
                accountExternalId,
                amount: currencyAmount,
              },
              // Are there any uncategorized at all for Plaid?
            }),
            externalCategory,
            externalStatus: t.pending ? 'pending' : undefined,
          },
        }
      },
    },
    // Should this run at runtime rather than sync time? That way we don't have to
    // keep resyncing the 10k institutions from Plaid to make this happen...
    integration: (ins) => ({
      name: ins.name,
      logoUrl: ins.logo ? `data:image/png;base64,${ins.logo}` : undefined,
      loginUrl: ins.url ?? undefined,
      verticals: ['banking'],
    }),
    resource: (settings) => {
      // TODO: Unify item.error and webhookItemError into a single field
      // so we know what the true status of the item is...
      const err =
        (settings.item?.error as PlaidError | null) ?? settings.webhookItemError
      const envName = inferPlaidEnvFromToken(settings.accessToken)
      return {
        id: `${settings.itemId}`,
        displayName: settings.institution?.name ?? '',
        status:
          err?.error_code === 'ITEM_LOGIN_REQUIRED'
            ? 'disconnected'
            : err
              ? 'error'
              : 'healthy',
        statusMessage: err?.error_message,
        labels: [envName],
      }
    },
  },
} satisfies ConnectorDef<typeof plaidSchemas>

function isInvestmentTransaction(
  txn: plaid.Transaction | plaid.InvestmentTransaction,
): txn is plaid.InvestmentTransaction {
  return 'investment_transaction_id' in txn
}

export default plaidDef
