import type {HeronSDKTypes} from '@opensdks/sdk-heron'
import {initHeronSDK} from '@opensdks/sdk-heron'
import type {ConnectorServer} from '@openint/cdk'
import {cachingLink} from '@openint/cdk'
import {fromCompletion, Rx, rxjs} from '@openint/util'
import type {heronSchemas} from './def'
import {helpers} from './def'

type components = HeronSDKTypes['oas']['components']

export const heronServer = {
  sourceSync: ({endUser, config}) => {
    const heron = initHeronSDK({
      headers: {authorization: `Basic ${btoa(`:${config.apiKey}`)}`},
    })

    async function* iterateEntities() {
      const endUserId = endUser?.id
      if (!endUserId) {
        throw new Error('endUser is required for heron source sync')
      }
      // TODO: Abstract different paging strategies into re-usable functions, similar to airbyte low-code connector for example
      const res = await heron
        .GET('/api/end_users/{end_user_id_or_heron_id}/transactions', {
          params: {path: {end_user_id_or_heron_id: endUserId}, query: {}},
        })
        .then((r) => r.data)
      yield (res.transactions_enriched ?? []).map((txn) =>
        helpers._opData('transaction', txn.heron_id!, txn),
      )
    }
    return rxjs
      .from(iterateEntities())
      .pipe(Rx.mergeMap((ops) => rxjs.from([...ops, helpers._op('commit')])))
  },
  destinationSync: ({config, endUser}) => {
    const endUserId = endUser?.id
    if (!endUserId) {
      throw new Error('endUser is required for heron source sync')
    }
    const heron = initHeronSDK({
      headers: {authorization: `Basic ${btoa(`:${config.apiKey}`)}`},
    })

    // Need init event and complete event to better handle the creation
    // and set ready state of the user

    return cachingLink((cache) =>
      fromCompletion(async () => {
        const transactions = Object.values(cache.transaction)
        if (!transactions.length) {
          return
        }
        await heron
          .GET('/api/end_users/{end_user_id_or_heron_id}', {
            params: {path: {end_user_id_or_heron_id: endUserId}},
          })
          .catch(() =>
            heron.POST('/api/end_users', {
              body: {end_user: {end_user_id: endUserId}},
            }),
          )

        await heron.POST(
          '/api/end_users/{end_user_id_or_heron_id}/transactions',
          {
            params: {path: {end_user_id_or_heron_id: endUserId}},
            body: {
              transactions: Object.entries(cache.transaction).map(
                ([
                  id,
                  txn,
                ]): components['schemas']['EndUserTransactionPostAsync'] => ({
                  amount: txn.postingsMap?.main?.amount.quantity ?? 0,
                  currency: txn.postingsMap?.main?.amount.unit ?? '',
                  description: txn.description,
                  reference_id: id, // txn.id is somehow null...
                  account_id: txn.postingsMap?.main?.accountId ?? '',
                  date: txn.date,
                  categories_default: txn.externalCategory,
                }),
              ),
            },
          },
        )
        // TODO Do this once when all transactions have completed processing
        await heron.PUT('/api/end_users', {
          body: {end_user: {end_user_id: endUserId, status: 'ready'}},
        })
      }),
    )
  },
} satisfies ConnectorServer<typeof heronSchemas>

export default heronServer
