import type {ConnectorServer} from '@openint/cdk'
import {Rx, rxjs} from '@openint/util'
import type {mootaSchemas} from './def'
import {mootaHelpers} from './def'
import {makeMootaClient} from './mootaClient'

export const mootaServer = {
  sourceSync: ({config}) => {
    const moota = makeMootaClient(config)
    const accounts: Moota.BankAccount[] = []
    async function* iterateEntities() {
      for await (const acc of moota.iterateAllBankAccounts()) {
        accounts.push(...acc.data)
        yield acc.data.map((a) => mootaHelpers._opData('account', a.bank_id, a))
      }

      for (const {bank_id} of accounts) {
        for await (const transaction of moota.iterateAllTransactions({
          bank_id,
        })) {
          yield transaction.data.map((t) =>
            mootaHelpers._opData('transaction', t.mutation_id, t),
          )
        }
      }
    }

    return rxjs
      .from(iterateEntities())
      .pipe(
        Rx.mergeMap((ops) => rxjs.from([...ops, mootaHelpers._op('commit')])),
      )
  },
} satisfies ConnectorServer<typeof mootaSchemas>

export default mootaServer
