import type {ConnectorServer} from '@openint/cdk'
import {Rx, rxjs} from '@openint/util'
import type {saltedgeSchemas} from './def'
import {saltedgeHelpers} from './def'
import {makeSaltedgeClient} from './saltedgeClient'

export const saltedgeServer = {
  sourceSync: ({config, settings}) => {
    const saltedge = makeSaltedgeClient(config)
    async function* iterateEntities() {
      for await (const accounts of saltedge.iterateAllAccounts({
        connection_id: settings._id,
      })) {
        yield accounts.map((a) =>
          saltedgeHelpers._opData('account', a.id, {...a}),
        )
      }

      const txnGenerator = saltedge.iterateAllTransactions({
        connection_id: settings._id,
      }) // TODO: Complete txnGenerator conditials

      for await (const transactions of txnGenerator) {
        yield transactions.map((t) =>
          saltedgeHelpers._opData('transaction', t.id, t),
        )
      }
    }

    return rxjs
      .from(iterateEntities())
      .pipe(
        Rx.mergeMap((ops) =>
          rxjs.from([...ops, saltedgeHelpers._op('commit')]),
        ),
      )

    // TODO: Move handlePushData
  },
} satisfies ConnectorServer<typeof saltedgeSchemas>

export default saltedgeServer
