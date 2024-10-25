import type {ConnectorServer} from '@openint/cdk'
import type {z} from '@openint/util'
import {Rx, rxjs} from '@openint/util'
import type {wiseSchemas} from './def'
import {wiseHelpers} from './def'
import type {profileResponseItemSchema} from './WiseClient'
import {makeWiseClient} from './WiseClient'

export const wiseServer = {
  postConnect: (input) => ({
    resourceExternalId: input.apiToken ?? '',
    settings: {
      envName: input.envName ?? '',
      apiToken: input.apiToken,
    },
  }),
  sourceSync: ({settings}) => {
    const client = makeWiseClient({...settings})
    async function* iterateEntities() {
      const res = await client.getProfiles(settings.envName)
      wiseHelpers
      yield res.map((a) => wiseHelpers._opData('account', `${a.id}`, a))

      const combineRes = await Promise.all(
        res.map(
          async (a: z.infer<typeof profileResponseItemSchema>) =>
            await client.getTransfers({
              envName: settings.envName,
              profileId: a.id,
            }),
        ),
      )
      // TODO: Need to check is it better than use the  basic promise all
      // const res2 = await rxjs.firstValueFrom(
      //   rxjs
      //     .from(res)
      //     .pipe(
      //       rxjs.mergeMap( (el: z.infer<typeof profileResponseItemSchema>) =>
      //         rxjs.from(client.getTransfers({envName: input.envName, profileId: el.id}),)
      //       ),
      //       rxjs.toArray()
      //     ),
      // )
      const res2 = combineRes.flat(1)

      yield res2.map((t) => wiseHelpers._opData('transaction', `${t.id}`, t))
    }

    return rxjs
      .from(iterateEntities())
      .pipe(
        Rx.mergeMap((ops) => rxjs.from([...ops, wiseHelpers._op('commit')])),
      )
  },
} satisfies ConnectorServer<typeof wiseSchemas>

export default wiseServer
