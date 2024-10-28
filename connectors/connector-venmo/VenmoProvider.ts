import type {ConnectorServer} from '@openint/cdk'
import {Rx, rxjs} from '@openint/util'
import type {venmoSchemas} from './def'
import {helpers} from './def'
import {makeVenmoClient} from './VenmoClient'

export const venmoServer = {
  sourceSync: ({config, settings: {credentials}}) => {
    const venmo = makeVenmoClient(config, credentials)
    async function* iterateEntities() {
      const me = await venmo.getCurrentUser()
      yield [me].map((a) => helpers._opData('account', `${a.user.id}`, a))
      const iterator = venmo.iterateAllTransactions({
        currentUser: me,
      })
      // TODO: Iterate venmo statements and sync to balance records
      for await (const transactions of iterator) {
        yield transactions.map((t) =>
          helpers._opData('transaction', t.id, {
            ...t,
            _currentUserId: me.user.id,
          }),
        )
      }
    }
    return rxjs
      .from(iterateEntities())
      .pipe(Rx.mergeMap((ops) => rxjs.from([...ops, helpers._op('commit')])))
  },
} satisfies ConnectorServer<typeof venmoSchemas>

export default venmoServer
