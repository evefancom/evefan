import type {ConnectorServer} from '@openint/cdk'
import {Rx, rxjs} from '@openint/util'
import type {splitwiseSchemas} from './def'
import {formatUser, splitwiseHelpers} from './def'
import {makeSplitwiseClient} from './SplitwiseClientNext'

export const splitwiseServer = {
  sourceSync: ({settings: {accessToken}}) => {
    const splitwise = makeSplitwiseClient({accessToken})

    async function* iterateEntities() {
      const groups = await splitwise.getGroups()

      yield groups.map((a) => splitwiseHelpers._opData('account', `${a.id}`, a))

      let offset = 0
      let limit = 100

      while (true) {
        const expenses = await splitwise.getExpenses({offset, limit})
        if (expenses.length === 0) {
          break
        }
        yield expenses.map((t) => {
          // For now it's easiest to get the group name
          // TODO: Need to check for the better way to get the group name
          const group_name =
            groups.find(
              (a) =>
                a.name
                  .toLowerCase()
                  .includes(formatUser(t.users[0]?.user).toLowerCase()),
              // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
            )?.name || formatUser(t.users[0]?.user)
          return splitwiseHelpers._opData('transaction', `${t.id}`, {
            ...t,
            group_name,
          })
        })
        offset += expenses.length
        limit = 500
      }
    }

    return rxjs
      .from(iterateEntities())
      .pipe(
        Rx.mergeMap((ops) =>
          rxjs.from([...ops, splitwiseHelpers._op('commit')]),
        ),
      )
  },
} satisfies ConnectorServer<typeof splitwiseSchemas>

export default splitwiseServer
