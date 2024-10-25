import {
  createHTTPClient,
  memoize,
  OAuth2Client,
  z,
  zFunction,
} from '@openint/util'

export type EnvName = z.infer<typeof zEnvName>
export const zEnvName = z.enum(['sandbox', 'live'])
export const zWiseConfig = z.object({
  // Will be use if we use the oauth, but cannot get the client Id and clientSecret from sandbox
  clientId: z.string().nullish(),
  clientSecret: z.string().nullish(),
  redirectUri: z.string().nullish(),

  apiToken: z.string().nullish(),
})

const balanceOrTransferAccountSchema = z.object({
  types: z.enum(['STANDARD', 'SAVINGS']).nullish(),
  profileId: z.number(),
  envName: zEnvName,
})

export const profileResponseItemSchema = z.object({
  id: z.number(),
  type: z.string(),
  details: z.object({
    avatar: z.string().nullish(),
    dateOfBirth: z.string().nullish(),
    firstName: z.string().nullish(),
    firstNameInKana: z.string().nullish(),
    lastName: z.string().nullish(),
    lastNameInKana: z.string().nullish(),
  }),
})

export const transferResponseItemSchema = z.object({
  id: z.number(),
  user: z.number(),
  targetAccount: z.number(),
  sourceAccount: z.number().nullish(),
  quote: z.string().nullish(),
  quoteUuid: z.string().nullish(),
  status: z.string().nullish(),
  reference: z.string().nullish(),
  rate: z.number().nullish(),
  created: z.string(),
  business: z.number().nullish(),
  details: z.object({
    reference: z.string().nullish(),
  }),
  hasActiveIssues: z.boolean().nullish(),
  sourceCurrency: z.string().nullish(),
  sourceValue: z.number().nullish(),
  targetCurrency: z.string().nullish(),
  targetValue: z.number().nullish(),
  customerTransactionId: z.string().nullish(),
})

export const makeWiseClient = zFunction(zWiseConfig, (cfg) => {
  function defaultUrl(envName: EnvName) {
    switch (envName) {
      case 'sandbox':
        return 'https://api.sandbox.transferwise.tech'
      case 'live':
        return 'https://api.transferwise.com'
    }
  }
  const fromEnv = memoize((envName: EnvName | undefined) => {
    const secret = cfg.apiToken

    if (!envName || !secret) {
      throw new Error(`Unable to get client envName=${envName}`)
    }

    return createHTTPClient({
      baseURL: defaultUrl(envName),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
      },
    })
  })

  const oAuth2Client = new OAuth2Client({
    authorizeURL: '',
    clientId: cfg.clientId ?? '',
    clientSecret: cfg.clientSecret ?? '',
    tokenURL: 'https://api.sandbox.transferwise.tech/oauth/token',
    clientAuthLocation: 'header',
  })

  return {
    getAccessToken: zFunction(() =>
      oAuth2Client.getTokenWithClientCredentials().then((r) => r.access_token),
    ),
    getProfiles: zFunction(zEnvName, (envName) =>
      fromEnv(envName)
        .get<unknown>('/v1/profiles')
        .then((r) => profileResponseItemSchema.array().parse(r.data)),
    ),
    getBalanceAccount: zFunction(balanceOrTransferAccountSchema, (opts) =>
      fromEnv(opts.envName)
        .get<unknown>(`/v4/profiles/${opts.profileId}/balances`, {
          params: {types: opts.types ?? 'STANDARD'},
        })
        .then((r) => r.data),
    ),
    getTransfers: zFunction(balanceOrTransferAccountSchema, (opts) =>
      fromEnv(opts.envName)
        .get<unknown>('/v1/transfers', {
          params: {profile: opts.profileId},
        })
        .then((r) => transferResponseItemSchema.array().parse(r.data)),
    ),
  }
})
