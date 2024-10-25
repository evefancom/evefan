// @deprecated , directly use the new openapi client instead
import {
  formDataBodySerializer,
  HTTPError as OpenapiHTTPError,
} from '@opensdks/runtime'
import {initYodleeSDK} from '@opensdks/sdk-yodlee'
import {
  $makeProxyAgent,
  createHTTPClient,
  DateTime,
  getDefaultProxyAgent,
  parseDateTime,
  R,
  z,
  zFunction,
  type HTTPError,
} from '@openint/util'
import type {YodleeAccount, YodleeTransaction} from './yodlee.types'

export type YodleeEnvName = z.infer<typeof zYodleeEnvName>
export const zYodleeEnvName = z.enum(['sandbox', 'development', 'production'])

export const zConfig = z.object({
  envName: zYodleeEnvName,
  clientId: z.string(),
  clientSecret: z.string(),
  adminLoginName: z.string(),

  /** Really only valid for the sandbox environment, TODO Support array */
  sandboxLoginName: z.string().nullish(), // z.array(z.string()).nullish(),
  /**
   * Yodlee production environment requires IP address whitelisting.
   * Run a proxy with a static IP address that you whitelisted to get it working
   */
  proxy: z.object({url: z.string(), cert: z.string()}).nullish(),
})

export const zAccessToken = z.object({
  accessToken: z.string(),
  issuedAt: z.string(),
  expiresIn: z.number(), // seconds
})

const zCommonCreds = z.object({
  // Cache
  accessToken: zAccessToken.nullish(),
})

export const zUserCreds = zCommonCreds.extend({
  loginName: z.string(),
})

export const zCreds = z.discriminatedUnion('role', [
  zCommonCreds.extend({role: z.literal('admin')}),
  zUserCreds.extend({role: z.literal('user')}),
])

/** Yodlee comma-delimited ids */
type YodleeIds = z.input<typeof zYodleeIds>
export const zYodleeId = z
  .union([z.number(), z.string()])
  .transform((id) => (typeof id === 'string' ? Number.parseInt(id) : id))
  .openapi({refType: 'input'}) // @see https://github.com/samchungy/zod-openapi#zod-effects
// Ideally when converting we should default to always refType input... Or basically
// allow the zodToOas31Schema to control this instead.
const zYodleeIds = z.union([zYodleeId, z.array(zYodleeId)])

function idToString(id: YodleeIds) {
  return Array.isArray(id) ? id.join(',') : id.toString()
}

function baseUrlFromEnvName(envName: Yodlee.EnvName) {
  switch (envName) {
    case 'sandbox':
      return 'https://sandbox.api.yodlee.com/ysl'
    case 'development':
      return 'https://development.api.yodlee.com/ysl'
    case 'production':
      return 'https://production.api.yodlee.com/ysl'
  }
}

export const makeYodleeClient = zFunction([zConfig, zCreds], (cfg, creds) => {
  let accessToken = creds.accessToken
  const httpsAgent =
    getDefaultProxyAgent() ?? (cfg.proxy && $makeProxyAgent(cfg.proxy))

  const http = createHTTPClient({
    baseURL: baseUrlFromEnvName(cfg.envName),
    httpsAgent,

    headers: {
      'cache-control': 'no-cache',
      'Content-Type': 'application/json',
      'Api-Version': '1.1',
    },
    requestTransformer: (req) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (req.headers.Authorization != null) {
        return req
      }
      if (accessToken) {
        req.headers = {
          ...(req.headers as Record<string, unknown>),
          Authorization: `Bearer ${accessToken.accessToken}`,
        }
      }

      return req
    },
    errorTransformer: (err) => {
      if (err.response?.data) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
        return new YodleeError(err.response.data as any, err)
      }
      return err
    },
    refreshAuth: {
      shouldProactiveRefresh: (req) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (req.headers.Authorization != null || req.headers['loginName']) {
          return false
        }
        if (accessToken) {
          const expiresAt = DateTime.fromISO(accessToken.issuedAt).plus({
            seconds: accessToken.expiresIn - 30, // 30 seconds buffer
          })
          const now = DateTime.utc()
          return expiresAt <= now
        }

        return true
      },
      shouldSkipRefresh: (req) => !!req.url?.endsWith('auth/token'),
      refresh: async () => {
        accessToken = await generateAccessToken(
          creds.role === 'user' ? creds.loginName : cfg.adminLoginName,
        )
        // TODO: Add a callback upon access token being generated
      },
    },
  })

  const api = initYodleeSDK({
    baseUrl: baseUrlFromEnvName(cfg.envName),
  })

  const generateAccessToken = zFunction(z.string(), async (loginName: string) =>
    api
      .POST('/auth/token', {
        headers: {loginName},
        body: {clientId: cfg.clientId, secret: cfg.clientSecret},
        bodySerializer: formDataBodySerializer,
      })
      .then((r) => zAccessToken.parse(r.data)),
  )

  const getProvider = zFunction(zYodleeId, async (providerId) =>
    api
      .GET('/providers/{providerId}', {params: {path: {providerId}}})
      .then((r) => {
        if (!r.data?.provider?.[0]) {
          throw new YodleeNotFoundError({
            entityName: 'Provider',
            entityId: `${providerId}`,
          })
        }
        return r.data.provider[0]
      }),
  )

  const client = {
    get accessToken() {
      return accessToken
    },
    generateAccessToken,
    getProvider,
    async registerUser(user: {loginName: string; email: string}) {
      const token = await generateAccessToken(cfg.adminLoginName)
      return http
        .post<{user: Yodlee.User}>(
          '/user/register',
          {user},
          {headers: {Authorization: `Bearer ${token.accessToken}`}},
        )
        .then((r) => r.data.user)
    },

    getUser: () =>
      api
        .GET('/user')
        .then((r) => r.data?.user)
        .catch((err) => {
          if (
            err instanceof OpenapiHTTPError &&
            // TODO: is this still correct? We really need better error typing...
            // Alternatively maybe we should not throw errors by default because it makes it much harder
            // to get typed error handling...
            (err.error as any).errorCode === 'Y008'
          ) {
            throw new YodleeNotFoundError({
              entityName: 'User',
              entityId: creds.role === 'user' ? creds.loginName : '',
            })
          }
          throw err
        }),

    async updateUser(user: {email?: string; loginName?: string}) {
      return http
        .put<{user: Yodlee.User}>('/user', {user})
        .then((r) => r.data.user)
    },

    async unregisterUser() {
      return http.delete('/user/unregister')
    },

    async getProviderAccount(providerAccountId: number | string) {
      return http
        .get<{providerAccount: Yodlee.ProviderAccount[]}>(
          `/providerAccounts/${providerAccountId}`,
          {params: {include: 'preferences'}},
        )
        .then((r) => r.data.providerAccount[0])
    },

    getProviderAccounts: zFunction(
      z.object({getProviders: z.boolean().optional()}).optional(),
      async (opts) => {
        const pas = await http
          .get<{providerAccount: Yodlee.ProviderAccount[]}>(
            '/providerAccounts',
            {
              params: {include: 'preferences'},
            },
          )
          .then((r) => r.data.providerAccount || [])
        if (!opts?.getProviders) {
          return pas
        }
        const providers = await Promise.all(
          R.uniq(pas.map((pa) => pa.providerId)).map((id) =>
            getProvider(id).catch((err) => {
              // Can happen if provider is removed from yodlee
              console.warn(`Error getting provider id=${id}`, err)
              return null
            }),
          ),
        )
        return pas.map((pa) => ({
          ...pa,
          provider: providers.find((p) => p?.id === pa.providerId),
        }))
      },
    ),

    // TODO: Figure out how to do this right via Yodlee
    async forceRefreshProviderAccount(providerAccountId: string | number) {
      return client.updateProviderAccounts({
        providerAccountIds: [providerAccountId],
        datasetName: ['BASIC_AGG_DATA'],
      })
    },

    /** Use params {"datasetName": ["BASIC_AGG_DATA"]} to refresh transactions */
    async updateProviderAccounts({
      providerAccountIds,
      ...data
    }: {
      providerAccountIds: Array<string | number>
      datasetName: string[]
    }) {
      return http
        .put<{providerAccount: Yodlee.ProviderAccount[]}>(
          '/providerAccounts',
          data,
          {params: {providerAccountIds: providerAccountIds.join(',')}},
        )
        .then((r) => r.data.providerAccount)
    },

    async deleteProviderAccount(providerAccountId: number | string) {
      return http.delete(`/providerAccounts/${providerAccountId}`)
    },

    async getAccounts(params: {providerAccountId?: number | string} = {}) {
      return http
        .get<{account: [YodleeAccount]}>('/accounts', {params})
        .then((r) => r.data.account || [])
    },

    async getAccount({
      accountId,
      ...params
    }: {
      accountId: string
      container: string
    }) {
      return http
        .get<{account: [YodleeAccount]}>(`/accounts/${accountId}`, {params})
        .then((r) => {
          if (!r.data.account) {
            throw new YodleeNotFoundError({
              entityName: 'Account',
              entityId: accountId,
            })
          }
          return r.data.account[0]
        })
    },

    async getHoldingsWithSecurity(params: Yodlee.GetHoldingsParams) {
      const holdings = await client.getHoldings(params)
      const holdingSecurities =
        holdings.length === 0
          ? await client.getHoldingSecurities({
              holdingId: holdings.map((h) => h.id),
            })
          : []
      return holdings.map(
        (h): Yodlee.HoldingWithSecurity => ({
          ...h,
          security: holdingSecurities.find((hs) => hs.id === h.id)?.security,
        }),
      )
    },

    /** Will set `include=assetClassification` by default */
    async getHoldings(params: Yodlee.GetHoldingsParams) {
      // Adding include=assetClassification causes crash https://share.getcloudapp.com/geuz4Ndg
      // if (params.include === undefined) {
      //   params.include = 'assetClassification'
      // }
      return http
        .get<{holding?: Yodlee.Holding[]}>('/holdings', {params})
        .then((r) => r.data.holding ?? [])
    },

    async getHoldingSecurities(params: {holdingId: YodleeIds}) {
      params.holdingId = idToString(params.holdingId)
      return http
        .get<{holding?: Yodlee.HoldingSecurity[]}>('/holdings/securities', {
          params,
        })
        .then((r) => r.data.holding ?? [])
    },

    async getHoldingTypeList() {
      return http.get<{}>('/holdings/holdingTypeList').then((r) => r.data)
    },

    async getAccountHistoricalBalances(params: {accountId: number | string}) {
      return http
        .get<{
          account: [
            {id: number; historicalBalances: Yodlee.HistoricalBalance[]},
          ]
        }>('/accounts/historicalBalances', {params})
        .then((r) => r.data.account[0].historicalBalances)
    },

    /**
     * https://developer.yodlee.com/api-reference#!/dataExtracts/getPollingData
     * The get extracts events service is used to learn about occurrences of data extract related events. This service currently supports only the DATA_UPDATES event.
     * Passing the event name as DATA_UPDATES provides information about users for whom data has been modified in the system for the specified time range. To learn more, please refer to the dataExtracts page.
     * You can retrieve data in increments of no more than 60 minutes over the period of the last 7 days from today's date.
     * This service is only invoked with either admin access token or a cobrand session.
     */
    async getEvents(params: {
      eventName: Yodlee.EventName
      fromDate: ISODateTime
      toDate: ISODateTime
    }) {
      return http
        .get<{event: Yodlee.Event}>('dataExtracts/events', {params})
        .then((r) => r.data.event)
    },

    /**
     * https://developer.yodlee.com/api-reference#!/dataExtracts/getUserData
     */
    async getUserData(params: {
      loginName: string
      fromDate: ISODateTime
      toDate: ISODateTime
    }) {
      return http
        .get<{userData: Yodlee.UserData[]}>('dataExtracts/userData', {params})
        .then((r) => r.data.userData || [])
    },

    async *iterateEvents(eventName: Yodlee.EventName) {
      // 7 day max range
      let end = DateTime.utc().startOf('second')
      const earliest = end.minus({days: 7})

      while (true) {
        const start = end.minus({hours: 1})
        if (start < earliest) {
          break
        }
        // in fact singular
        const events = await client.getEvents({
          eventName,
          fromDate: start.toISO({suppressMilliseconds: true}),
          toDate: end.toISO({suppressMilliseconds: true}),
        })

        yield events
        end = start
      }
    },

    async *iterateUserDataFromLinks(links: Yodlee.Link[]) {
      for (const link of links) {
        const token = await generateAccessToken(cfg.adminLoginName)
        const userData = await http
          .get<{userData: Yodlee.UserData[]}>(link.href, {
            headers: {Authorization: `Bearer ${token.accessToken}`},
          })
          .then((r) => r.data.userData || [])
        yield userData
      }
    },

    async getStatements(params: Yodlee.GetStatementParams) {
      return http
        .get<{statement: Yodlee.Statement[]}>('/statements', {
          params,
        })
        .then((r) => r.data.statement || [])
    },

    async getTransactions(params: Yodlee.GetTransactionParams) {
      return http
        .get<{transaction: YodleeTransaction[]}>('/transactions', {
          params,
        })
        .then((r) => r.data.transaction || [])
    },

    async getTransactionsCount(params: Yodlee.GetTransactionParams) {
      const end = DateTime.local().plus({days: 1})
      const start = DateTime.fromMillis(0)
      return http
        .get<{transaction: {TOTAL: {count: number}}}>('/transactions/count', {
          params: {
            fromDate: start.toISODate(),
            toDate: end.toISODate(),
            ...params,
          },
        })
        .then((r) => r.data.transaction.TOTAL.count)
    },

    /**
     * @param options accountId is an optional field, and may be a comma-separated array
     */
    async *iterateAllTransactions(
      options: {
        skipInvestmentTransactions?: boolean
        accountId?: string
        start?: ISODate
        end?: ISODate
      } = {},
    ) {
      // Eliminate any effect of timezones by just adding a day
      const end = parseDateTime(options.end) ?? DateTime.local().plus({days: 1})
      // Should be nothing since before epoch zero.
      // This turns out to be 1969-12-31 but who cares
      const start = parseDateTime(options.start) ?? DateTime.fromMillis(0)

      let offset = 0
      // Fetch 100 transactions only on the first request to optimize for incremental
      // sync scenarios
      let count = 100

      // Yodlee count is wrong / not to be relied upon
      // https://app.asana.com/0/1161030597644209/1161031415900757
      // const total = await getTransactionsCount(params)
      while (true) {
        const transactions = await client.getTransactions({
          accountId: options.accountId,
          skip: offset,
          top: count,
          fromDate: start.toISODate(),
          toDate: end.toISODate(),
        })
        if (transactions.length === 0) {
          break
        }
        yield transactions.filter((t) => {
          if (options.skipInvestmentTransactions) {
            return t.CONTAINER !== 'investment'
          }
          return true
        })
        offset += transactions.length
        count = 500
        // if (offset >= total) {
        //   break
        // }
      }
    },

    async getSubscribedEvents() {
      return http
        .get<{event: Yodlee.SubscribedEvent[]}>('/configs/notifications/events')
        .then((r) => r.data.event || [])
    },

    async subscribeEvent(
      eventName: Yodlee.EventName,
      params: {event: {callbackUrl: string}},
    ) {
      // 204 no content
      await http.post(`/configs/notifications/events/${eventName}`, params)
    },

    async updateSubscription(
      eventName: Yodlee.EventName,
      params: {event: {callbackUrl: string}},
    ) {
      // 204 no content
      await http.put(`/configs/notifications/events/${eventName}`, params)
    },

    async deleteSubscription(eventName: Yodlee.EventName) {
      await http.delete(`/configs/notifications/events/${eventName}`)
    },

    async getInstitutions() {
      return http
        .get<{institution: Yodlee.Institution[]}>('/institutions')
        .then((r) => r.data)
    },

    async *iterateInstitutions() {
      let skip = 0
      const limit = 500
      // TODO: Consider making use of the getProviderCount endpoint
      // so we can parallel request institutions for performance, might need to
      // take into account rate limiter though...
      while (true) {
        // console.log('Will request institution', {skip})
        const {data: res = {}} = await api.GET('/institutions', {
          params: {query: {skip, top: limit}},
        })

        // console.log('got ins response', res)
        if (res.institution?.length) {
          yield res.institution
          skip += res.institution.length
        }
        if ((res.institution?.length ?? 0) < limit) {
          break
        }
      }
    },
  }

  return client
})

/**
 * @see https://developer.yodlee.com/Yodlee_API/docs/v1_1/API_Error_Codes
 */
export class YodleeError extends Error {
  override name = 'YodleeError'

  constructor(
    public readonly data: {
      errorCode: string // "Y804",
      errorMessage: string // "Permitted values of top between 1 - 500",
      referenceCode: string // "u1455707934756c4F23u"
    },
    public readonly originalError: HTTPError,
  ) {
    super(`[${data.errorCode}] ${data.errorMessage}`)
    Object.setPrototypeOf(this, YodleeError.prototype)
  }
}

// TODO: Merge with YodleeError somehow... Otherwise isIntance fails :(
export class YodleeNotFoundError extends Error {
  override name = 'YodleeNotFoundError'

  constructor(
    public readonly data: {
      entityName:
        | 'User'
        | 'Account'
        | 'Provider'
        | 'ProviderAccount'
        | 'Transaction'
        | 'Holdings'
      entityId: string
    },
  ) {
    super(`${data.entityName} not found`)
    Object.setPrototypeOf(this, YodleeNotFoundError.prototype)
  }
}
