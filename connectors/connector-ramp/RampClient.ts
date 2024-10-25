import {
  createHTTPClient,
  memoize,
  OAuth2Client,
  z,
  zFunction,
} from '@openint/util'

export const zRampConfig = z.object({
  clientId: z.string(),
  clientSecret: z.string(),
})

/**
 * Reference: https://docs.ramp.com/reference/models/user
 */
const userResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  role: z.enum([
    'BUSINESS_ADMIN',
    'BUSINESS_USER',
    'BUSINESS_OWNER',
    'BUSINESS_BOOKKEEPER',
  ]),
  phone: z.string(),
  location_id: z.string().nullish(),
  department_id: z.string().nullish(),
  manager_id: z.string().nullish(),
  business_id: z.string(),
  is_manager: z.boolean(),
  status: z.enum([
    'INVITE_PENDING',
    'INVITE_DELETED',
    'INVITE_EXPIRED',
    'USER_ONBOARDING',
    'USER_ACTIVE',
    'USER_SUSPENDED',
  ]),
})

const getTokenInputSchema = z.object({
  code: z.string(),
  redirectUri: z.string(),
})

export const transactionInputSchema = z.object({
  accessToken: z.string(),
  start: z.string().nullish(),
})

/** Reference: https://docs.ramp.com/reference/models/business */
export const businessResponseSchema = z.object({
  active: z.boolean(),
  billing_address: z.object({
    address1: z.string(),
    city: z.string(),
    country: z.string(),
    postal_code: z.string(),
    state: z.string(),
  }),
  business_name_legal: z.string(),
  business_name_on_card: z.string(),
  created_time: z.string(),
  enforce_sso: z.boolean(),
  id: z.string(),
  initial_approved_limit: z.number(),
  is_integrated_with_slack: z.boolean(),
  is_reimbursements_enabled: z.boolean(),
  limit_locked: z.boolean(),
  phone: z.string(),
  website: z.string(),
})

/**
 * References: https://docs.ramp.com/reference/models/transaction
 */
export const transactionResponseItemSchema = z.object({
  amount: z.number(),
  card_holder: z.object({
    location_name: z.string(),
    location_id: z.string(),
    department_name: z.string(),
    department_id: z.string(),
    first_name: z.string(),
    last_name: z.string(),
  }),
  card_id: z.string(),
  id: z.string(),
  merchant_id: z.string(),
  merchant_name: z.string(),
  sk_category_id: z.number().nullish(),
  sk_category_name: z.string().nullish(),
  state: z.enum(['DECLINED', 'CLEARED', 'PENDING']),
  user_transaction_time: z.string(),
  receipts: z.string().array().nullish(),
  memo: z.string().nullish(),
  accounting_categories: z.array(
    z.object({
      category_id: z.string().nullish(),
      category_name: z.string().nullish(),
      tracking_category_remote_id: z.string().nullish(),
      tracking_category_remote_name: z.string().nullish(),
      tracking_category_remote_type: z.string().nullish(),
    }),
  ),
  merchant_category_code: z.string(),
  merchant_descriptor: z.string().nullish(),
  merchant_category_code_description: z.string(),
})

const transactionResponsesSchema = z.object({
  data: z.array(transactionResponseItemSchema),
  page: z.object({
    next: z.string().nullish(),
  }),
})

export const makeRampClient = zFunction(zRampConfig, (cfg) => {
  const createClient = memoize((accessToken: string) =>
    createHTTPClient({
      baseURL: 'https://api.ramp.com/developer/v1',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Bearer ${accessToken}`,
      },
    }),
  )

  const oAuth2Client = new OAuth2Client({
    authorizeURL: 'https://app.ramp.com/v1/authorize',
    clientId: cfg.clientId,
    clientSecret: cfg.clientSecret,
    tokenURL: 'https://api.ramp.com/developer/v1/token',
    clientAuthLocation: 'header',
  })

  return {
    getAccessToken: zFunction(() =>
      oAuth2Client
        .getTokenWithClientCredentials({
          scope: 'users:read transactions:read business:read',
        })
        .then((r) => r.access_token),
    ),
    getAuthorizeUrl: zFunction(z.string(), (redirectUri) =>
      oAuth2Client.getAuthorizeUrl({
        redirect_uri: redirectUri,
        scope: 'users:read transactions:read business:read',
      }),
    ),
    getToken: zFunction(getTokenInputSchema, (opts) =>
      oAuth2Client
        .getToken(opts.code, opts.redirectUri)
        .then((r) => r.access_token),
    ),
    getUsers: zFunction(z.string(), (token) =>
      createClient(token)
        .get<{data: unknown[]}>('/users')
        .then((r) => r.data.data.map((u) => userResponseSchema.parse(u))),
    ),
    getTransactions: zFunction(transactionInputSchema, (opts) =>
      createClient(opts.accessToken)
        .get<{data: unknown[]; page: {next: string}}>('/transactions', {
          params: {start: opts.start},
        })
        .then((r) => transactionResponsesSchema.parse(r.data)),
    ),
    getBusiness: zFunction(z.string(), (token) =>
      createClient(token)
        .get<unknown>('/business')
        .then((r) => businessResponseSchema.parse(r.data)),
    ),
  }
})
