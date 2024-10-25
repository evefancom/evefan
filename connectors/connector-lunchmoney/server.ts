import type {ConnectorServer} from '@openint/cdk'
import {Rx, rxjs} from '@openint/util'
import type {lunchmoneySchemas} from './def'
import {lunchmoneyHelpers} from './def'
import {makeLunchmoneyClient} from './lunchmoneyClient'

export const lunchmoneyServer = {
  sourceSync: ({config}) => {
    const lunchmoney = makeLunchmoneyClient(config)
    async function* iterateEntities() {
      const assets = await lunchmoney.getAssets()
      const categories = await lunchmoney.getCategories()
      yield assets.map((a) =>
        lunchmoneyHelpers._opData('account', `${a.id}`, {
          ...a,
          _type: 'asset',
        }),
      )

      yield categories.map((c) =>
        lunchmoneyHelpers._opData('account', `${c.id}`, {
          ...c,
          _type: 'category',
        }),
      )

      for await (const transactions of lunchmoney.iterateAllTransactions({
        debit_as_negative: true,
      })) {
        yield transactions.map((t) =>
          lunchmoneyHelpers._opData('transaction', `${t.id}`, t),
        )
      }
    }
    return rxjs
      .from(iterateEntities())
      .pipe(
        Rx.mergeMap((ops) =>
          rxjs.from([...ops, lunchmoneyHelpers._op('commit')]),
        ),
      )
  },
} satisfies ConnectorServer<typeof lunchmoneySchemas>

export default lunchmoneyServer
