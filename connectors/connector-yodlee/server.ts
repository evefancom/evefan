import type {ConnectorServer} from '@openint/cdk'
import {Rx, rxjs} from '@openint/util'
import type {yodleeSchemas} from './def'
import {helpers} from './def'
import {makeYodleeClient} from './YodleeClient'

export const yodleeServerConnector = {
  // TODO: handle reconnecting scenario
  preConnect: async (config, {extEndUserId: userId}) => {
    const loginName =
      config.envName === 'sandbox' ? config?.sandboxLoginName : userId
    if (!loginName) {
      throw new Error('[Yodlee] Sandbox login name not configured')
    }
    const accessToken = await makeYodleeClient(config, {
      role: 'admin',
    }).generateAccessToken(loginName)
    return {accessToken, envName: config.envName}
  },
  // Without closure we get type issues in venice.config.ts, not sure why
  // https://share.cleanshot.com/X3cQDA

  postConnect: async (
    {providerAccountId, providerId},
    config,
    {extEndUserId: userId},
  ) => {
    // Should we get accessToken & loginName from the preConnect phase?
    const loginName =
      config.envName === 'sandbox' ? config?.sandboxLoginName : userId
    if (!loginName) {
      throw new Error('[Yodlee] Sandbox login name not configured')
    }
    const yodlee = makeYodleeClient(config, {role: 'user', loginName})
    const [providerAccount, provider, user] = await Promise.all([
      yodlee.getProviderAccount(providerAccountId),
      yodlee.getProvider(providerId),
      yodlee.getUser(),
    ])

    return {
      resourceExternalId: providerAccountId,
      settings: {
        loginName,
        providerAccountId,
        provider,
        providerAccount,
        user,
        accessToken: yodlee.accessToken,
      },
      integration: provider
        ? {externalId: providerId, data: {...provider}}
        : undefined,
    }
  },

  sourceSync: ({config, settings: {providerAccountId, ...settings}}) => {
    const yodlee = makeYodleeClient(config, {role: 'user', ...settings})
    async function* iterateEntities() {
      const [accounts, holdings] = await Promise.all([
        yodlee.getAccounts({providerAccountId}),
        SHOULD_SYNC_HOLDINGS
          ? yodlee.getHoldingsWithSecurity({providerAccountId})
          : Promise.resolve([]),
      ])

      yield [
        ...accounts.map((a) => helpers._opData('account', `${a.id}`, a)),
        ...holdings.map(
          // Need to check on if to use h.id or h.security.id
          (h) => helpers._opData('commodity', `${h.id}`, h),
        ),
      ]
      // TODO(P2): How does yodlee handle pending transactions
      // TODO: Implement incremental sync
      for await (const transactions of yodlee.iterateAllTransactions({
        skipInvestmentTransactions: !SHOULD_SYNC_INVESTMENT_TRANSACTIONS,
        accountId: accounts.map((a) => a.id).join(','),
      })) {
        yield transactions.map((t) =>
          helpers._opData('transaction', `${t.id}`, t),
        )
      }
    }
    return rxjs
      .from(iterateEntities())
      .pipe(Rx.mergeMap((ops) => rxjs.from([...ops, helpers._op('commit')])))
  },

  metaSync: ({config}) => {
    // console.log('[yodlee.metaSync]', config)
    // TODO: Should environment name be part of the yodlee institution id itself?
    const yodlee = makeYodleeClient(config, {role: 'admin'})
    return rxjs.from(yodlee.iterateInstitutions()).pipe(
      Rx.mergeMap((institutions) => rxjs.from(institutions)),
      Rx.map((ins) =>
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        helpers._intOpData(`${ins.id!}` as ExternalId, {...ins}),
      ),
    )
  },
} satisfies ConnectorServer<typeof yodleeSchemas>

const SHOULD_SYNC_HOLDINGS = false
const SHOULD_SYNC_INVESTMENT_TRANSACTIONS = true

export default yodleeServerConnector
