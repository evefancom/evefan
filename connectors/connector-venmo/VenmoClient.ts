import type {HTTPError, HTTPRequestConfig, MPDate} from '@openint/util'
import {
  $makeProxyAgent,
  createHTTPClient,
  DateTime,
  getDefaultProxyAgent,
  parseDateTime,
  z,
  zFunction,
} from '@openint/util'
import {parseOptionalDateTime} from './venmo-helpers'

export const zConfig = z.object({
  v1BaseURL: z.string().nullish(),
  v5BaseURL: z.string().nullish(),
  proxy: z.object({url: z.string(), cert: z.string()}).nullish(),
})

export const zCreds = z.object({
  cookie: z.string().nullish(),
  accessToken: z.string().nullish(),
})

export const makeVenmoClient = zFunction([zConfig, zCreds], (config, creds) => {
  const httpsAgent =
    getDefaultProxyAgent() ?? (config.proxy && $makeProxyAgent(config.proxy))

  const http = createHTTPClient({
    httpsAgent,
    headers: creds.accessToken
      ? {Authorization: `Bearer ${creds.accessToken}`}
      : {Cookie: creds.cookie},
    requestTransformer: (req) => {
      if (req.url?.startsWith('v1')) {
        req.baseURL = config.v1BaseURL ?? 'https://api.venmo.com'
      }
      if (req.url?.startsWith('v5')) {
        req.baseURL = config.v5BaseURL ?? 'https://venmo.com/api'
      }
      return req
    },
    errorTransformer: (err) => {
      if (err?.response?.data) {
        return new VenmoError(err.response.data, err)
      }
      return err
    },
  })

  async function getData<T>(url: string, config?: HTTPRequestConfig) {
    return http.get<Venmo.GetResponse<T>>(url, config).then((r) => r.data.data)
  }
  const client = {
    async login(input: {
      phoneEmailOrUsername: string
      password: string
      /**
       * Device fingerprint. Used to remember pw and such.
       * If missing will get error 294 A device fingerprint was expected but not found
       */
      deviceId: string
    }) {
      return http
        .post<Venmo.OauthAccessTokenResponse>(
          'v1/oauth/access_token',
          {
            client_id: '1',
            phone_email_or_username: input.phoneEmailOrUsername,
            password: input.password,
          },
          {headers: {'device-id': input.deviceId}},
        )
        .then((r) => r.data)
    },

    /** Revokes the Bearer access token in Authorization header */
    async logout() {
      return http.delete('v1/oauth/access_token')
    },
    /**
     * Corresponds to Remembered Devices screen in Venmo app
     * When signing in on these devices, you won't have to submit a code to
     * confirm your identity
     */
    async getDevices() {
      return getData<Venmo.GetResponse<Venmo.Device[]>>('v1/users/devices')
    },

    async getCurrentUser() {
      // `v1/account` seems to return the same data
      return getData<Venmo.GetCurrentUserData>('v1/me')
    },

    // Friends

    async getSuggestedContacts() {
      return getData<Venmo.GetResponse<Venmo.User[]>>('v1/suggested')
    },

    async getUserFriends(userExternalId: string, params?: {limit: number}) {
      return getData<Venmo.GetResponse<Venmo.User[]>>(
        `v1/users/${userExternalId}/friends`,
        {params},
      )
    },

    // Payments

    async getPaymentMethods() {
      return getData<Venmo.GetResponse<Venmo.PaymentMethod[]>>(
        'v1/payment-methods',
      )
    },

    // https://api.venmo.com/v1/payments?action=charge&actor=339005241556992945&limit=20&status=pending,held
    async getPayments(params: {
      actor: string
      action: 'pay' | 'charge'
      limit?: number
      status?: Array<'loading' | 'held' | 'settled'>
    }) {
      return getData<Venmo.GetResponse<Venmo.Payment[]>>('v1/payments', {
        params,
      })
    },

    /** This one actually moves money. Be very careful with it */
    async payOrCharge(data: {
      /** Positve amount to pay, negative amount means to request */
      amount: number
      /** TODO: Empirically I only saw 'friends' and guessed the other to */
      audience: 'friends' | 'public' | 'private'
      /** This is the `for` field in Venmo */
      note: string
      /** Target user's userExternalId */
      user_id: string
      /**
       * `PaymentMethod.id`. Only applicable for outgoing payment.
       * Used when Venmo balance falls short
       */
      funding_source_id?: string
    }) {
      return http.post<Venmo.PayOrChargeReponse>('v1/payments', data)
    },

    // MARK: Statements

    async getTransactionHistory(params: {
      start_date: string
      end_date: string
    }) {
      return getData<Venmo.GetTransactionHistoryData>(
        'v1/transaction-history',
        {params},
      )
    },

    async *iterateAllTransactions(opts?: {
      currentUser?: Venmo.GetCurrentUserData
      earliestDate?: ISODateTime
    }) {
      let earliestDate = parseOptionalDateTime(opts?.earliestDate)
      if (!earliestDate) {
        const currentUser = opts?.currentUser ?? (await this.getCurrentUser())
        earliestDate = parseDateTime(currentUser.user.date_joined)
      }
      // Eliminate any effect of timezones by expanding the date range by 1 day
      earliestDate = earliestDate?.minus({days: 1}).startOf('day') as MPDate
      // A transaction that happened at 7:30pm Feb 9 PT is actually considered 2/10
      // by Venmo in the statement API because of UTC, which handles dates differently
      // compare to feeds
      let end = DateTime.local().plus({days: 1})

      let start = end.minus({months: 1})

      while (true) {
        try {
          const res = await this.getTransactionHistory({
            start_date: start.toISODate(),
            end_date: end.toISODate(),
          })
          yield res.transactions
        } catch (err) {
          // https://api.venmo.com/v1/transaction-history?start_date=2011-06-01&end_date=2011-06-30
          // Currently returns 500 error
          // Turns out there's no transactions before June 20, 2011 and June 21, 2011
          // transaction history returns 500 error
          // Here are the 3 transactions that get returned via feed / stories endpoint
          // but not returned via transaction history endpoint
          // https://venmo.com/story/4dffe2c8fd5b91461f2abea6
          // https://venmo.com/story/4dffe2f8fd5b91461f2abeac
          // https://venmo.com/story/4dffe617fd5b91461f2abfb2
          // Together they make up the beginnning balance of 183 shown here
          // https://venmo.com/account/statement?end=06-30-2011&start=06-22-2011
          // In all likelihood these are my earliest venmo transactions
          // and venmo encounters error when it happens
          console.error('[venmo] Error getting txns', err)
          if (
            !(err instanceof VenmoError) ||
            (err.originalError.code ?? 0) < 500
          ) {
            throw err
          }
        }
        end = start.minus({days: 1})
        start = end.minus({days: 90})
        if (end < earliestDate) {
          break
        }
      }
    },

    // MARK: Homepage stories

    // Not the same as https://venmo.com/api/v5/users/${shortUserId}/feed?limit=1000
    async getStories(
      userExternalId: string,
      // `social_only: False` corresponds to `feed=mine`, which is the Mine tab
      params: {before_id?: string; limit?: number; social_only?: 'False'} = {},
    ) {
      params.social_only = params.social_only ?? 'False'
      return http
        .get<Venmo.GetStoryResponse>(
          `v1/stories/target-or-actor/${userExternalId}`,
          {
            params,
          },
        )
        .then((r) => r.data)
    },

    async *iterateAllStories(
      userExternalId: string,
      params?: {social_only?: 'False'},
    ) {
      // 50 is the largest venmo allows server side
      const limit = 50
      let beforeId: string | undefined

      while (true) {
        const res = await this.getStories(userExternalId, {
          ...params,
          before_id: beforeId,
          limit,
        })
        yield res.data
        if (!res.pagination.next) {
          break
        }
        beforeId = res.data[res.data.length - 1]?.id
      }
    },

    // MARK: V5 APIs

    async v5GetCurrentUser() {
      return http.get<VenmoV5.GetMeResponse>('v5/me').then((r) => r.data)
    },

    async v5GetFeed(
      userId: string,
      /** `until`: epoch time in seconds. `limit` can be large, like 1k */
      params: {until?: number; limit?: number} = {},
    ) {
      return http
        .get<VenmoV5.GetFeedResponse>(`v5/users/${userId}/feed`, {params})
        .then((r) => r.data)
    },
  }

  return client
})

export class VenmoError extends Error {
  override name = 'VenmoError'

  constructor(
    public readonly data: unknown,
    public readonly originalError: HTTPError,
  ) {
    super(`[HTTP ${originalError.code}] ${JSON.stringify(data).slice(0, 200)}`)
    Object.setPrototypeOf(this, VenmoError.prototype)
  }
}
