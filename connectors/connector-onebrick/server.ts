import type {ConnectorServer, SyncOperation} from '@openint/cdk'
import {zEndUserId} from '@openint/cdk'
import {md5Hash, R, Rx, rxjs, z} from '@openint/util'
import type {onebrickSchemas} from './def'
import {helpers} from './def'
import {makeOneBrickClient} from './OneBrickClient'

type OnebrickEntity = z.infer<(typeof helpers)['sourceOutputEntity']>
type OnebrickSyncOperation = SyncOperation<OnebrickEntity>

const zOneBrickWebhookBody = z.object({
  accessToken: z.string(),
  bankId: z.string().nullish(),
  userId: z.string().nullish(),
})

export const onebrickServerConnector = {
  preConnect: (config) =>
    Promise.resolve({
      publicToken: config.publicToken,
      redirect_url: config.redirectUrl,
    }),

  sourceSync: ({settings, config}) => {
    makeOneBrickClient({
      ...config,
      accessToken: settings.accessToken,
    })
    async function* iterateEntities() {
      // const res = await client.getAccountList({
      //   accessToken: settings.accessToken,
      // })
      // yield res.map((a) =>
      //   _op({
      //     type: 'data',
      //     data: {id: a.accountId, entity: a, entityName: 'account'},
      //   }),
      // )
      // const res2 = await client.getTransactions({
      //   accessToken: settings.accessToken,
      // })
      // yield res2.map((t) =>
      //   _op({
      //     type: 'data',
      //     data: {id: t.reference_id, entity: t, entityName: 'transaction'},
      //   }),
      // )
    }

    return rxjs
      .from(iterateEntities())
      .pipe(Rx.mergeMap((ops) => rxjs.from([...ops, _op({type: 'commit'})])))
  },

  handleWebhook: (input, _config) => {
    const {accessToken, userId} = zOneBrickWebhookBody.parse(input.body)
    // TODO: Add verification to check webhook came from oneBrick provider in fact..
    // TODO: Get the bank detail using bankId so we can put it up there
    // TODO: Figure out if accessToken is actually the only unique thing about
    // onebrick resource, and whether they could be rotated...
    return helpers._webhookReturn(md5Hash(accessToken), {
      settings: helpers.resourceSettings.parse({accessToken}),
      endUserId: zEndUserId.parse(userId),
      triggerDefaultSync: true,
    })
  },
} satisfies ConnectorServer<typeof onebrickSchemas>

const _op: typeof R.identity<OnebrickSyncOperation> = R.identity

export default onebrickServerConnector
