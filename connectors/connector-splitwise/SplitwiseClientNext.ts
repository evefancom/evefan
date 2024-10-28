import type {HTTPError} from '@openint/util'
import {createHTTPClient, OAuth2Client, z, zFunction} from '@openint/util'
import type {zCurrentUser, zExpense, zGroup} from './splitwise-schema'
import {zExpensesParams} from './splitwise-schema'

const zSplitwiseConfig = z.object({
  baseURL: z.string().nullish(),
  accessToken: z.string(),
  clientId: z.string().nullish(),
  clientSecret: z.string().nullish(),
})

export const makeSplitwiseClient = zFunction(zSplitwiseConfig, (cfg) => {
  const createClient = () =>
    createHTTPClient({
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      baseURL: cfg.baseURL || 'https://secure.splitwise.com/api/v3.0',
      requestTransformer: (req) => {
        req.headers = {
          ...(req.headers as Record<string, unknown>),
          Authorization: `Bearer ${cfg.accessToken}`,
        }
        return req
      },
      errorTransformer: (err) => {
        if (err.response?.data) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
          return new SplitwiseError(err.response.data as any, err)
        }
        return err
      },
    })

  const oAuth2Client = new OAuth2Client({
    authorizeURL: 'https://secure.splitwise.com/oauth/authorize',
    clientId: cfg.clientId ?? '',
    clientSecret: cfg.clientSecret ?? '',
    tokenURL: 'https://secure.splitwise.com/oauth/token',
    clientAuthLocation: 'header',
  })

  return {
    getToken: zFunction(
      z.object({
        code: z.string(),
        redirectUri: z.string(),
      }),
      ({code, redirectUri}) => oAuth2Client.getToken(code, redirectUri),
    ),

    getCurrentUser: zFunction(() =>
      createClient()
        .get<{user: z.infer<typeof zCurrentUser>}>('get_current_user')
        .then((r) => r.data.user),
    ),

    getGroups: zFunction(() =>
      createClient()
        .get<{groups: Array<z.infer<typeof zGroup>>}>('get_groups')
        .then((r) => r.data.groups),
    ),

    getExpenses: zFunction(zExpensesParams, (params) =>
      createClient()
        .get<{expenses: Array<z.infer<typeof zExpense>>}>('get_expenses', {
          params,
        })
        .then((r) => r.data.expenses),
    ),
  }
})

class SplitwiseError extends Error {
  override name = 'SplitwiseError'

  errors: unknown[] = [
    ...(this.data.errors ?? []),
    ...(this.data.error ? [this.data.error] : []),
  ]

  constructor(
    public readonly data: {
      errors?: unknown[]
      error?: unknown
      [k: string]: unknown
    },
    public readonly originalError: HTTPError,
  ) {
    super(
      `${[...(data.errors ?? []), ...(data.error ? [data.error] : [])].join(
        ', ',
      )}`,
    )
    Object.setPrototypeOf(this, SplitwiseError.prototype)
  }
}
