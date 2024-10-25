import type {ConnectorServer} from '@openint/cdk'
import type {z} from '@openint/util'
import {Rx, rxjs} from '@openint/util'
import type {tellerSchemas} from './def'
import {helpers} from './def'
import type {accountTellerSchema, transactionItemSchema} from './TellerClient'
import {listTellerInstitutions, makeTellerClient} from './TellerClient'

export const tellerServer = {
  // eslint-disable-next-line @typescript-eslint/require-await
  preConnect: async (config) => ({
    userToken: '',
    applicationId: config.applicationId,
  }),
  // eslint-disable-next-line @typescript-eslint/require-await
  postConnect: async (input, _config) => ({
    resourceExternalId: input.token, // FIXME
    settings: {token: input.token},
    // institution // FIXME
  }),
  sourceSync: ({settings, config}) => {
    const client = makeTellerClient({...config, token: settings.token})
    async function* iterateEntities() {
      const res = await client.getAccounts(undefined)
      const combineRes = await Promise.all(
        res.map(async (a: z.infer<typeof accountTellerSchema>) => ({
          ...a,
          balance: await client.getAccountBalances({id: a.id}),
        })),
      )
      yield combineRes.map((a: z.infer<typeof accountTellerSchema>) =>
        helpers._opData('account', a.id, a),
      )

      const combineRes2 = await Promise.all(
        res.map(
          async (a: z.infer<typeof accountTellerSchema>) =>
            await client.getTransactions({
              id: a.id,
            }),
        ),
      )
      const res2 = combineRes2.flat(1)
      yield res2.map((t: z.infer<typeof transactionItemSchema>) =>
        helpers._opData('transaction', t.id, t),
      )
    }

    return rxjs
      .from(iterateEntities())
      .pipe(Rx.mergeMap((ops) => rxjs.from([...ops, helpers._op('commit')])))
  },
  listIntegrations() {
    return Promise.resolve({
      items: listTellerInstitutions().map((ins) => ({
        id: ins.id,
        name: ins.name,
        updated_at: new Date().toISOString(),
        logo_url: ins.logoUrl,
        raw_data: ins as any,
      })),
      has_next_page: false,
      next_cursor: null,
    })
  },
} satisfies ConnectorServer<typeof tellerSchemas>

export default tellerServer
