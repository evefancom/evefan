import type {ConnectorServer} from '@openint/cdk'
import {Rx, rxjs} from '@openint/util'
import type {rampSchemas} from './def'
import {rampHelpers} from './def'
import {makeRampClient} from './RampClient'

export const rampServer = {
  postConnect: (input) => ({
    resourceExternalId: input.clientId ?? '',
    settings: input,
    triggerDefaultSync: true,
  }),

  // Disable it for now until it's ready
  // handleWebhook: (input) => {
  //   const conn = identity<z.infer<typeof base['resourceSchema']>>({
  //     clientId: '',
  //     clientSecret: '',
  //     authorizationCode: input.query['code'] as string,
  //   })
  //   const sync$: rxjs.Observable<RampSyncOperation> =
  //     rampProvider.sourceSync(conn)
  //   return rxjs.concat(sync$)
  // },
  sourceSync: ({settings, config}) => {
    const client = makeRampClient(config.oauth)
    async function* iterateEntities() {
      const accessToken = await client.getAccessToken()
      // const accessToken = await client.getToken({
      //   code: input.authorizationCode ?? '',
      //   redirectUri: `${redirectUri}/api/webhook/ramp`,
      // })
      // TODO: Need to do pagination for account if it necessary
      const res = [await client.getBusiness(accessToken)]
      yield res.map((a) => rampHelpers._opData('account', a.id, a))

      let starting_after = settings.startAfterTransactionId ?? undefined
      while (true) {
        const res2 = await client.getTransactions({
          accessToken,
          start:
            starting_after && starting_after.length > 0
              ? starting_after
              : undefined,
        })
        starting_after = res2.data[res2.data.length - 1]?.id ?? ''
        yield [
          ...res2.data.map((t) => rampHelpers._opData('transaction', t.id, t)),
          // Use the hashed accessToken for now until we now what the id that can we use for meta data
          rampHelpers._opState({
            // accessToken: md5Hash(settings.accessToken ?? ''),
            startAfterTransactionId: starting_after,
          }) as never, // Temp hack... not sure why
        ]
        if (!res2.page.next) {
          break
        }
      }
    }

    return rxjs
      .from(iterateEntities())
      .pipe(
        Rx.mergeMap((ops) => rxjs.from([...ops, rampHelpers._op('commit')])),
      )
  },
} satisfies ConnectorServer<typeof rampSchemas>

export default rampServer
