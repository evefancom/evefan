import type {ConnectorServer} from '@openint/cdk'
import {Rx, rxjs} from '@openint/util'
import type {togglSchemas} from './def'
import {togglHelpers} from './def'
import {makeTogglClient} from './TogglCient'

export const togglServer = {
  postConnect: (input) => ({
    resourceExternalId: input.apiToken,
    settings: {
      apiToken: input.apiToken,
      email: input.email,
      password: input.password,
    },
    triggerDefaultSync: true,
  }),

  sourceSync: ({settings}) => {
    const client = makeTogglClient({...settings})
    async function* iterateEntities() {
      const user = await client.getMe()
      const res = await client.getProjects(`${user.default_workspace_id}`)
      yield res.map((a) => togglHelpers._opData('account', `${a.id}`, a))

      // TODO: Need to pass params if necessary
      const res2 = await client.getTimeEntries()
      yield res2.map((t) => togglHelpers._opData('transaction', `${t.id}`, t))
    }

    return rxjs
      .from(iterateEntities())
      .pipe(
        Rx.mergeMap((ops) => rxjs.from([...ops, togglHelpers._op('commit')])),
      )
  },
} satisfies ConnectorServer<typeof togglSchemas>

export default togglServer
