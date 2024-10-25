import {initStripeSDK} from '@opensdks/sdk-stripe'
import type {ConnectorServer} from '@openint/cdk'
import {Rx, rxjs} from '@openint/util'
import type {stripeSchemas} from './def'
import {helpers} from './def'

export const stripeServer = {
  sourceSync: ({settings, state}) => {
    const stripe = initStripeSDK({
      headers: {authorization: `Basic ${btoa(`:${settings.secretKey}`)}`},
    })
    async function* iterateEntities() {
      const accountRes = await stripe
        .GET('/v1/accounts', {})
        .then((r) => r.data)
      // const balanceRes = await client.get('/v1/balance', {})

      yield accountRes.data.map((a) => helpers._opData('account', a.id, a))

      let starting_after = state.transactionSyncCursor ?? undefined
      while (true) {
        const res2 = await stripe
          .GET('/v1/balance_transactions', {
            params: {
              query: {
                starting_after:
                  starting_after && starting_after.length > 0
                    ? starting_after
                    : undefined,
              },
            },
          })
          .then((r) => r.data)
        starting_after = res2.data[res2.data.length - 1]?.id ?? ''
        yield [...res2.data.map((t) => helpers._opData('transaction', t.id, t))]
        // TODO: Need to check what can we use for retrieving meta data
        if (!res2.has_more) {
          break
        }
      }
    }

    return rxjs
      .from(iterateEntities())
      .pipe(Rx.mergeMap((ops) => rxjs.from([...ops, helpers._op('commit')])))
  },

  // TODO: Renable me again when we are ready
  // destinationSync: ({settings}) => {
  //   const client = makeStripeClient({apiKey: settings.secretKey})

  //   return handlersLink({
  //     data: async (op) => {
  //       const {data} = op

  //       if (data.entityName === 'invoice' && data.entity) {
  //         const entity = data.entity

  //         let invoice = await client
  //           .get('/v1/invoices/search', {
  //             query: {query: `metadata['entityId']:'${entity.id}'`},
  //           })
  //           .then((r) => r.data[0])
  //         if (invoice) {
  //           console.log('Skipping already created invoice', invoice.id)
  //           return op
  //         }

  //         const customer = await client
  //           .get('/v1/customers/search', {
  //             query: {query: `metadata['entityId']:'${entity.contact}'`},
  //           })
  //           .then(
  //             (r) =>
  //               r.data[0] ??
  //               client.post('/v1/customers', {
  //                 bodyForm: {metadata: {entityId: entity.contact!}},
  //               }),
  //           )

  //         // TODO: Handle update scenarios. Only dealing with soft deletes
  //         // should make this simpler
  //         // TODO: Gotta validate that the standard invoice before passing onto stripe
  //         // Most likely via a validator link in the middle
  //         invoice = await client.post('/v1/invoices', {
  //           bodyForm: {
  //             customer: customer.id,
  //             currency: entity.currency ?? undefined,
  //             // In stripe description is probably visible for users...
  //             // so it's an issue.
  //             description: entity.memo ?? undefined,
  //             metadata: {entityId: data.id},
  //           },
  //         })
  //         await Promise.all(
  //           (entity.line_items ?? []).map((line) =>
  //             client.post('/v1/invoiceitems', {
  //               bodyForm: {
  //                 metadata: {entityId: line.id},
  //                 invoice: invoice?.id,
  //                 customer: customer.id, // Technically redundant
  //                 description: line.description ?? undefined,
  //                 quantity: line.quantity ?? undefined,
  //                 unit_amount: line.unit_price ?? undefined,
  //                 // amount cannot be specified together with unit_amount
  //                 // amount: line.total_amount ?? undefined,
  //               },
  //             }),
  //           ),
  //         )
  //       }

  //       return op
  //     },
  //   })
  // },
} satisfies ConnectorServer<typeof stripeSchemas>

export default stripeServer
