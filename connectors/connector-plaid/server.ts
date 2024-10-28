import {initSDK} from '@opensdks/runtime'
import type {PlaidSDKTypes} from '@opensdks/sdk-plaid'
import {plaidSdkDef} from '@opensdks/sdk-plaid'
import type {PlaidApi, PlaidError} from 'plaid'
import * as plaid from 'plaid'
import {CountryCode, Products} from 'plaid'
import type {ConnectorServer} from '@openint/cdk'
import type {DurationObjectUnits, IAxiosError} from '@openint/util'
import {DateTime, R, RateLimit, Rx, rxjs} from '@openint/util'
import type {plaidSchemas} from './def'
import {helpers as def} from './def'
import {inferPlaidEnvFromToken} from './plaid-utils'
import {getPlatformConfig, makePlaidClient, zWebhook} from './PlaidClient'

export function initPlaidSDK(options: PlaidSDKTypes['options']) {
  return initSDK(plaidSdkDef, options)
}
export type PlaidSDK = ReturnType<typeof initPlaidSDK>

export const plaidServerConnector = {
  // TODO: Do we actually need the preConnect and postConnect phase at all?
  // What if everything is encapsulated in useConnectHook and integrations each get to
  // expose trpc endpoints that the frontend can call at will?
  // That can solve for things like custom API endpoints that we do not have the right abstraction for
  // (such as sandboxFireWebhook, or sandboxLinkTokenCreate)
  // Should also be easier for newcomers to reason about
  // new methods
  // - prefetch
  // - connect
  // - commandsForResource
  preConnect: (
    config,
    {extEndUserId: userId, resource, integrationExternalId, ...ctx},
    input,
  ) => {
    if (input.sandboxPublicTokenCreate) {
      return makePlaidClient(config)
        .sandboxPublicTokenCreate({
          initial_products: [Products.Transactions],
          institution_id: 'ins_109508', // First Platipus bank
        })
        .then(({data: res}) => res)
    }
    return makePlaidClient(config)
      .linkTokenCreate({
        access_token: resource?.settings.accessToken, // Reconnecting
        institution_id: integrationExternalId
          ? `${integrationExternalId}`
          : undefined, // Probably doesn't work, but we wish it does...
        user: {client_user_id: userId},
        client_name: config.clientName,
        language: input.language ?? config.language,
        ...(!resource?.settings.accessToken && {products: config.products}),
        country_codes: config.countryCodes,
        // Webhook and redirect_uri would be part of the `resource` already.
        // redirect_uri: ctx.redirectUrl,
        webhook: ctx.webhookBaseUrl,
      })
      .then(({data: res}) => {
        console.log('willConnect response', res)
        return res
      })
  },

  postConnect: async ({publicToken: public_token, meta}, config) => {
    const client: PlaidApi = makePlaidClient(config)

    const [{data: res}, {data: insRes}] = await Promise.all([
      client.itemPublicTokenExchange({public_token}),
      meta?.institution?.institution_id && config.envName
        ? client.institutionsGetById({
            institution_id: meta.institution.institution_id,
            // Is this right? Get all country codes...
            country_codes: [
              CountryCode.Us,
              CountryCode.Gb,
              CountryCode.Es,
              CountryCode.Nl,
              CountryCode.Fr,
              CountryCode.Ie,
              CountryCode.Ca,
              CountryCode.De,
              CountryCode.It,
            ],
            options: {include_optional_metadata: true},
          })
        : {data: null},
    ])
    console.log('[Plaid post connect]', res, insRes)
    // We will wait to sync the institution until later
    const settings = def._type('resourceSettings', {
      itemId: res.item_id,
      accessToken: res.access_token,
      institution: insRes?.institution,
    })

    // Emit itemId
    return {
      resourceExternalId: res.item_id,
      settings,
      integration: insRes?.institution && {
        externalId: insRes.institution.institution_id,
        data: insRes.institution,
      },
      source$: rxjs.from(
        (meta?.accounts ?? []).map((a) => def._opData('account', a.id, a)),
      ),
      triggerDefaultSync: true,
    }
  },

  checkResource: async ({config, settings, options, context}) => {
    console.log('[Plaid] checkResource', options, context)
    const client = makePlaidClient(config)

    const itemId: string =
      settings.itemId ??
      settings.item?.item_id ??
      (await client
        .itemGet({access_token: settings.accessToken})
        .then((r) => r.data.item.item_id))
    const resoUpdate = {resourceExternalId: itemId}

    if (options.updateWebhook) {
      await client.itemWebhookUpdate({
        access_token: settings.accessToken,
        webhook: context.webhookBaseUrl,
      })
      return {
        ...resoUpdate,
        triggerDefaultSync: true, // to update settings.item.webhook
        // postgres deepMerge is not implemented yet
        // settings: {item: {webhook: context.webhookBaseUrl}},
      }
    }
    if (options.sandboxSimulateUpdate) {
      await client.sandboxItemFireWebhook({
        access_token: settings.accessToken,
        // webbook_type defaults to `ITEM`, but if `ITEM` is explicitly
        // passed in, it would unfortunately error @see https://share.cleanshot.com/ZfZU3U
        // webhook_type: plaid.WebhookType.Item,
        webhook_code:
          plaid.SandboxItemFireWebhookRequestWebhookCodeEnum.DefaultUpdate,
      })
    }
    if (options.sandboxSimulateDisconnect) {
      await client.sandboxItemResetLogin({access_token: settings.accessToken})
      // To immediate get item to be in a loginRequired state, as it is hard for us to
      // generate an item error and put it inside settings.item.
      // And because this call does nto appear to trigger any webhook
      return {...resoUpdate, triggerDefaultSync: true}
    }
    return resoUpdate
  },

  revokeResource: (settings, config) =>
    makePlaidClient(config)
      .itemRemove({access_token: settings.accessToken})
      .catch((err: IAxiosError) => {
        // TODO: Centralize me inside PlaidClient...
        if (
          err.isAxiosError &&
          (err.response?.data as PlaidError | undefined)?.error_code ===
            'ITEM_NOT_FOUND'
        ) {
          console.log('plaidError', err.response?.data)
          return
        }
        throw err
      }),

  sourceSync: ({config, settings, state, streams}) => {
    const {accessToken} = settings
    // Explicit typing to make TS Compiler job easier...
    const client: PlaidApi = makePlaidClient(config)

    async function* iterateEntities() {
      // Sync item
      const accountIds = state.accountIds?.length ? state.accountIds : null
      const {
        data: {item, status},
      } = await client.itemGet({access_token: accessToken})

      const institution = item.institution_id
        ? await client
            .institutionsGetById({
              institution_id: item.institution_id,
              country_codes: config.countryCodes,
              options: {include_optional_metadata: true},
            })
            .then((r) => r.data.institution)
        : undefined

      const {item_id: itemId} = item
      yield [
        def._opRes(itemId, {
          settings: {
            item,
            status,
            // Clear previous webhook error since item is now up to date
            webhookItemError: null,
            itemId,
            accessToken,
            institution,
          },
          integration: institution && {
            externalId: institution.institution_id,
            data: institution,
          },
        }),
      ]
      if (item.error) {
        console.log('Exiting sourceSync early due to itemError', item.error)
        return
      }

      // Sync accounts
      if (streams.account) {
        const {
          data: {accounts},
        } = await client.accountsGet({
          access_token: accessToken,
          options: {...(accountIds && {account_ids: accountIds})},
        })
        yield accounts.map((a) => def._opData('account', a.account_id, a))
      }

      let holdingsRes: plaid.InvestmentsHoldingsGetResponse | undefined | null
      // Investments shall be explicitly enabled for now...
      if (streams.holding) {
        await invHoldingsGetLimit()
        holdingsRes = await client
          .investmentsHoldingsGet({
            access_token: accessToken,
            options: {...(accountIds && {account_ids: accountIds})},
          })
          .then((r) => r.data)
          // TODO: Centralize me inside PlaidClient...
          .catch((err: IAxiosError) => {
            const code =
              err.isAxiosError &&
              (err.response?.data as PlaidError | undefined)?.error_code
            // Do not crash in case we run into this.
            if (
              // client is not authorized to access the following products: ["investments"]
              code === 'INVALID_PRODUCT' ||
              // "error_message": "the following products are not supported by this institution: [\"investments\"]",
              code === 'PRODUCTS_NOT_SUPPORTED'
            ) {
              return null
            }
            throw err
          })

        if (holdingsRes) {
          const {
            holdings,
            securities,
            accounts: investmentAccounts,
          } = holdingsRes
          console.log('investmentsHoldingsGet', {
            holdings,
            securities,
            investmentAccounts,
          })
        }
      }

      if (streams.transaction) {
        // Sync transactions
        let cursor = state.transactionSyncCursor ?? undefined
        while (true) {
          const res = await client
            .transactionsSync({
              access_token: accessToken,
              cursor,
              options: {include_personal_finance_category: true},
            })
            .then((r) => r.data)
            .catch((err: IAxiosError) => {
              const code =
                err.isAxiosError &&
                (err.response?.data as PlaidError | undefined)?.error_code
              // Do not crash in case we run into this.
              if (
                code === 'TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION' &&
                cursor !== undefined
              ) {
                cursor = undefined // Restart from scratch
                return null
              }
              throw err
            })
          // Only reason it would be null is if TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION
          // Gotta be careful of running into an infinite loop though. However it would eventually time out
          if (!res) {
            continue
          }

          cursor = res.next_cursor
          yield [
            ...[...res.added, ...res.modified]
              .filter((t) => !accountIds || accountIds.includes(t.account_id))
              .map((t) => def._opData('transaction', t.transaction_id, t)),
            ...R.pipe(
              res.removed,
              R.map((t) => t.transaction_id),
              R.compact,
              R.map((id) => def._opData('transaction', id, null)),
            ),
            def._opState({transactionSyncCursor: cursor}),
          ]
          if (!res.has_more) {
            break
          }
        }
      }

      // Sync investment transactions
      if (streams.investment_transaction) {
        // TODO: QA the incremental sync logic given that we are syncing
        // from the most recent to the least recent. Most of the time it should
        // be the other way around. Maybe combine responsiveness along with
        const sinceDate =
          (state.investmentTransactionEndDate &&
            DateTime.fromISO(state.investmentTransactionEndDate, {
              zone: 'UTC',
            })) ||
          DateTime.fromMillis(0)
        // Eliminate any effect of timezones by just adding a day
        let end = DateTime.utc().plus({days: 1})
        // Fetch 100 transactions over last 90 days only on the first request to optimize
        // for incremental sync scenarios
        let count = 100
        let dur: DurationObjectUnits = {days: 90}

        while (end > sinceDate) {
          // Specifying epoch zero seems to cause Plaid to freeze... So here's
          // our workaround
          const start = end.minus(dur)

          let offset = 0
          while (true) {
            await invTxnGetLimit()
            const {data: invTxnRes} = await client.investmentsTransactionsGet({
              access_token: accessToken,
              start_date: start.toISODate(),
              end_date: end.toISODate(),
              options: {
                ...(accountIds && {account_ids: accountIds}),
                count,
                offset,
              },
            })
            yield invTxnRes.investment_transactions.map((t) =>
              def._opData('transaction', t.investment_transaction_id, t),
            )

            offset += invTxnRes.investment_transactions.length
            // Now we can fetch more
            count = 500
            dur = {years: 1}
            if (offset >= invTxnRes.total_investment_transactions) {
              break
            }
          }
          end = start
        }
      }
    }

    return rxjs
      .from(iterateEntities())
      .pipe(Rx.mergeMap((ops) => rxjs.from([...ops, def._op('commit')])))
  },

  listIntegrations() {
    const plaid = makePlaidClient({envName: 'production'})
    return plaid
      .institutionsGet({
        country_codes: [CountryCode.Us],
        count: 100,
        offset: 0,
        options: {include_optional_metadata: true},
      })
      .then((res) => ({
        has_next_page: false,
        items: res.data.institutions.map((ins) => ({
          id: ins.institution_id,
          name: ins.name,
          logo_url: ins.logo ? `data:image/png;base64,${ins.logo}` : null,
          updated_at: new Date().toISOString(),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          raw_data: ins as any,
        })),
        next_cursor: null,
      }))
  },

  metaSync: ({config}) => {
    // Rate limit is easily exceeded, so we will have to introduce
    // a management layer for that, which will be process-wide and
    // eventually distributed rate limiter too
    // @see https://share.cleanshot.com/w7xCNK
    const client = makePlaidClient(config)
    async function* iterateInstitutions() {
      let offset = 0
      while (true) {
        console.log('Awaiting rate limit')
        await insGetLimit()
        const {data: institutions} = await client.institutionsGet({
          offset,
          count: 500,
          country_codes: [CountryCode.Us, CountryCode.Ca, CountryCode.Gb],
          options: {include_optional_metadata: true},
        })
        if (institutions.institutions.length === 0) {
          break
        }
        yield institutions.institutions.map((ins) =>
          def._intOpData(ins.institution_id as ExternalId, ins),
        )
        offset += institutions.institutions.length
      }
    }
    return rxjs
      .from(iterateInstitutions())
      .pipe(Rx.mergeMap((ops) => rxjs.from(ops)))
  },

  // TODO(P2): Verify Plaid webhook authenticity for added security.
  // https://plaid.com/docs/#webhook-verification
  handleWebhook: (input) => {
    const webhook = zWebhook.parse(input.body)
    console.log('[plaid] Received webhook', webhook)
    const DEFAULT_SYNC = def._webhookReturn(webhook.item_id, {
      triggerDefaultSync: true,
    })
    switch (webhook.webhook_type) {
      case 'ITEM': {
        switch (webhook.webhook_code) {
          case 'WEBHOOK_UPDATE_ACKNOWLEDGED':
            return {resourceUpdates: []}
          case 'ERROR':
            // delegate.patchResource({error: webhook.error})
            // await delegate.commit()
            console.error('[plaid] ITEM webhook error', webhook)
            return def._webhookReturn(webhook.item_id, {
              source$: rxjs.of(
                def._opRes(webhook.item_id, {
                  settings: {webhookItemError: webhook.error},
                }),
              ),
            })
        }
      }
      case 'TRANSACTIONS': {
        switch (webhook.webhook_code) {
          case 'INITIAL_UPDATE':
          case 'HISTORICAL_UPDATE':
            return DEFAULT_SYNC
          // return [{resourceExternalId, triggerDefaultSync: true}] // Incremental false?
          case 'DEFAULT_UPDATE':
            return DEFAULT_SYNC
          case 'TRANSACTIONS_REMOVED':
            return def._webhookReturn(webhook.item_id, {
              source$: rxjs.from(
                webhook.removed_transactions.map((tid) =>
                  def._opData('transaction', tid, null),
                ),
              ),
            })
        }
      }
      case 'HOLDINGS': {
        switch (webhook.webhook_code) {
          case 'DEFAULT_UPDATE':
            return DEFAULT_SYNC
        }
      }
      case 'INVESTMENTS_TRANSACTIONS': {
        switch (webhook.webhook_code) {
          case 'DEFAULT_UPDATE':
            return DEFAULT_SYNC
        }
      }
    }

    console.warn('[plaid] Unhandled webhook', webhook)
    return {resourceUpdates: []}
  },
  newInstance: ({config, settings}) => {
    const env = inferPlaidEnvFromToken(settings.accessToken)
    // https://plaid.com/docs/api/#api-host
    const creds = config.credentials ?? getPlatformConfig(env)
    const sdk = initSDK(plaidSdkDef, {
      baseUrl: `https://${env}.plaid.com`,
      headers: {
        'PLAID-CLIENT-ID': creds.clientId,
        'PLAID-SECRET': creds.clientSecret,
        'Content-Type': 'application/json',
      },
      // TODO: Solve this with link
      // links: (defaultLinks) => {
      //   const links: FetchLink[] = [
      //     (req, next) =>
      //       next(
      //         modifyRequest(req, {
      //           duplex: 'half',
      //             body: JSON.stringify({
      //               ...body,
      //               access_token: settings.accessToken,
      // }),
      //         }),
      //       ),

      //     ...defaultLinks,
      //   ]
      //   return Array.isArray(opts.links)
      //     ? opts.links
      //     : opts.links
      //       ? opts.links(links)
      //       : links
      // },
    })
    return {...sdk, accessToken: settings.accessToken}
  },
  passthrough: (instance, input) =>
    instance.request(input.method, input.path, {
      params: {query: input.query},
      headers: new Headers((input.headers ?? {}) as Record<string, string>),
      body: input.body,
    }),
} satisfies ConnectorServer<typeof plaidSchemas, PlaidSDK>

// Per client limit.
// TODO: Account for different rate limits for sandbox vs development & prduction
// TODO: Use a distributed rate limiter (maybe airbyte has one?) to go across more than
// a single process
/**
 * Institution get rate limit.. Not accounting for per item or per client yet...
 * https://plaid.com/docs/errors/rate-limit-exceeded/#production-and-development-rate-limits
 *
 * 10 requests per min is the limit in sandbox, we do 8 to be safe.
 * All of plaid's rate limits are per-minute...
 */
const insGetLimit = RateLimit(7, {timeUnit: 60 * 1000})

// Per item limits.
// TODO: Make these per item

/** 15 req / item / min. We do 10 to be safe */
const invHoldingsGetLimit = RateLimit(10, {timeUnit: 60 * 1000})
/** 30 req / item / min. We do 20 to be safe */
const invTxnGetLimit = RateLimit(20, {timeUnit: 60 * 1000})

export default plaidServerConnector
