import {createHTTPClient, DateTime, memoize, z, zFunction} from '@openint/util'
import {inferOneBrickEnvFromToken} from './onebrick-utils'

export type OneBrickEnvName = z.infer<typeof zOneBrickEnvName>
export const zOneBrickEnvName = z.enum(['sandbox', 'production'])
export const inputTokenSchema = {accessToken: z.string().nullish()}
export const inputAuthOneBrickSchema = z
  .object({
    institution_id: z.number(),
    username: z.string(),
  })
  .extend(inputTokenSchema)

export const inputOneBrickTransactionSchema = z
  .object({
    from: z.string().nullish(),
    to: z.string().nullish(),
  })
  .extend(inputTokenSchema)

export const inputAccountSchema = z
  .object({
    accountId: z.string(),
  })
  .extend(inputTokenSchema)

/**
{
  accountId: '123456789',
  accountHolder: 'John Doe',
  accountNumber: '+628123456789',
  balances: { available: 2128, current: 2128 },
  currency: 'IDR',
  type: 'Wallet',
  email: 'john.doe@gmail.com',
  address: null,
  phoneNumber: '+628123456789',
  ktpNumber: null
}
*/
export const accountItemSchema = z.object({
  accountId: z.string(),
  accountHolder: z.string(),
  accountNumber: z.string(),
  balances: z.object({
    available: z.number().nullish(),
    current: z.number().nullish(),
  }),
  currency: z.string(),
  type: z.string(),
  email: z.string().nullish(),
  address: z.string().nullish(),
  phoneNumber: z.string().nullish(),
  ktpNumber: z.string().nullish(),
})

/**
 {
    id: 0,
    account_id: '123456789',
    account_number: '123456789',
    account_currency: 'IDR',
    institution_id: 11,
    merchant_id: 0,
    outlet_outlet_id: 0,
    location_city_id: 0,
    location_country_id: 0,
    date: '2022-07-04',
    amount: 36400,
    description: 'GO-MART\nAlfamart Raya Ubud #MT-3114000183',
    status: 'CONFIRMED',
    direction: 'out',
    reference_id: '553318600-20220704-1',
    transaction_type: 'Wallet'
    category: { category_id: 6, category_name: 'purchase' }
  }
 */
export const transactionBrickSchema = z.object({
  id: z.number(),
  account_id: z.string(),
  account_number: z.string().nullish(),
  /** Double check if this is possible... */
  account_currency: z.string().nullish(),
  institution_id: z.number(),
  merchant_id: z.number(),
  outlet_outlet_id: z.number(),
  location_city_id: z.number(),
  location_country_id: z.number(),
  date: z.string(),
  amount: z.number(),
  description: z.string(),
  status: z.string(),
  direction: z.enum(['in', 'out']),
  reference_id: z.string(),
  transaction_type: z.string().nullish(),
  category: z.object({
    category_id: z.number(),
    category_name: z.string(),
  }),
})

/**
{ data: 'access-sandbox-78ce0669-d9fc-495f-b3ab-f19534143932' }
 */
export const userAccessTokenSchema = z.object({
  data: z.string(),
})

/**
 {
    id: 2,
    name: 'KlikBCA Internet Banking',
    bank_code: 'KlikBCA Internet Banking',
    country_code: 'ID',
    country_name: 'Indonesia',
    institution_type: 'Internet Banking'
  },
 */
export const institutionSchema = z.object({
  id: z.number(),
  name: z.string(),
  bank_code: z.string(),
  country_code: z.string(),
  country_name: z.string(),
  institution_type: z.string(),
})

/**
* GOPAY Response:
{
  username: '+6281234567890',
  uniqueId: 'F02A193D-FB5F-4831-A118-F6CA5BBC39ED',
  sessionId: '6DEA8B6D-E634-42A5-8FCF-450ED0C6B674',
  otpToken: 'cb67cb99-3608-47f2-9372-05fbb6ce3205'
}
* and you'll get the otp from SMS
*
* OVO Response:
{
  username: '+628123456890',
  refId: '9eb21a8e-f509-4f3a-b5fd-2c9d4a2c1f22',
  deviceId: 'ea124547-9457-4966-bd29-65ea7ba043d5'
}
*/
export const otpSchema = z.object({
  username: z.string(),
  otp: z.union([z.string(), z.number()]).nullish(),
  uniqueId: z.string().nullish(),
  sessionId: z.string().nullish(),
  otpToken: z.string().nullish(),

  refId: z.string().nullish(),
  deviceId: z.string().nullish(),
})

export const zOneBrickMultiConfig = z.object({
  publicTokens: z.record(zOneBrickEnvName, z.string()),
  accessToken: z.string().nullish(),
  clientId: z.string().nullish(),
  clientSecret: z.string().nullish(),
  redirectUrl: z.string().nullish(),
})

export const zOneBrickConfig = z.object({
  envName: zOneBrickEnvName,
  clientId: z.string(),
  clientSecret: z.string(),
  publicToken: z.string(),
  // TODO: Move these into settings
  accessToken: z.string().nullish(),
  redirectUrl: z.string().nullish(),
})

export function makeOneBrickClient(config: z.infer<typeof zOneBrickConfig>) {
  return makeOneBrickMultiClient({
    ...config,
    publicTokens: {[config.envName]: config.publicToken},
  }).fromEnv(config.envName)
}

/**
 * TODO: Switch to v2 api and OpenAPI based implementation
 *
 * curl --request GET \
     --url https://dash.readme.com/api/v1/api-registry/rwkfe1gl7puob14 \
     --header 'Accept: application/json'
 * from `const sdk = require('api')('@brickdocs/v2#rwkfe1gl7puob14');`
 * @see https://technical-docs.onebrick.io/v2/reference/auth-api-in-ovo
 * @see https://docs.readme.com/reference/getapiregistry
 *
 */
export const makeOneBrickMultiClient = zFunction(
  zOneBrickMultiConfig,
  (cfg) => {
    function defaultUrl(envName: OneBrickEnvName) {
      switch (envName) {
        case 'sandbox':
          return 'https://sandbox.onebrick.io/v1'
        case 'production':
          return 'https://api.onebrick.io/v1'
      }
    }
    const fromEnv = memoize((envName: OneBrickEnvName | undefined) => {
      const secret = envName && cfg.publicTokens[envName]
      if (!envName || !secret) {
        throw new Error(`Unable to get client envName=${envName}`)
      }
      return createHTTPClient({
        baseURL: defaultUrl(envName ?? 'sandbox'), // For testing with mock data
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cfg.accessToken ?? secret}`,
        },
      })
    })

    function fromToken(token: string) {
      return fromEnv(inferOneBrickEnvFromToken(token) ?? undefined)
    }

    return {
      fromEnv,
      /**
       * References:
       * - https://technical-docs.onebrick.io/reference/generate-otp-in-gopay
       * - https://technical-docs.onebrick.io/reference/generate-otp-in-ovo
       *
       * Examples:
       * - GoPay: CLIENT=<client-name> tsx <dir-cli> --accessToken 'public-sandbox-c52daf0f-63e8-4d96-9d26-43dcc0dc6fec' generateOTP --institution_id 11 --username '+628123456789'
       * - OVO: CLIENT=<client-name>  <dir-cli> --accessToken 'public-sandbox-c52daf0f-63e8-4d96-9d26-43dcc0dc6fec' generateOTP --institution_id 12 --username '+628123456789'
       */
      generateOTP: zFunction(inputAuthOneBrickSchema, (params) =>
        fromToken(params.accessToken ?? '')
          .post<{data: unknown}>('/auth', params)
          .then((r) => otpSchema.parse(r.data.data)),
      ),

      /**
       * References:
       * - https://technical-docs.onebrick.io/reference/generate-user-access-token-in-gopay
       * - https://technical-docs.onebrick.io/reference/generate-user-access-token-in-ovo
       *
       * Examples:
       * - GoPay: CLIENT=<client-name> tsx <dir-cli> generateUserAccessToken --uniqueId '1DF31390-1CA5-4428-B698-D0791658FA8F' --username '+6285172117757' --sessionId '20AAC44A-01F0-4F29-9940-2E3764C6B497' --otpToken 'fb5dfdd8-a34f-42f7-84fc-79f2d5615c06' --otp '6427'  --accessToken 'public-sandbox-c52daf0f-63e8-4d96-9d26-43dcc0dc6fec'
       * - OVO: CLIENT=<client-name> tsx <dir-cli> generateUserAccessToken --refId '9005a8f8-9be6-4abd-ae81-6d580318c5ad' --username '+628123456789' --deviceId 'cd6fd5f6-10da-4b22-b684-1cfd1a5c9407' --pin '111111' --otpNumber 'https://ovo.id/app/login?code=7b654f4272ead4a2634d2752214e900ebc8e13b4975f09fb92d05a0947a49b31' --accessToken 'public-sandbox-c52daf0f-63e8-4d96-9d26-43dcc0dc6fec'
       */
      generateUserAccessToken: zFunction(
        otpSchema.extend(inputTokenSchema),
        (params) =>
          fromToken(params.accessToken ?? '')
            .post(`/auth/${params.refId ? 'ovo' : 'gopay'}`, params)
            .then((r) => userAccessTokenSchema.parse(r.data)),
      ),
      /**
       * Reference: https://technical-docs.onebrick.io/reference/get-institution-list-1
       *
       * Example: tsx packages/@universal/usevenice-providers/onebrick/OnebrickClient.ts getInstitutions --accessToken 'public-sandbox-c52daf0f-63e8-4d96-9d26-43dcc0dc6fec'
       */
      getInstitutions: zFunction(z.object(inputTokenSchema), (params) =>
        fromToken(params.accessToken ?? '')
          .get<{data: unknown[]}>('/institution/list')
          .then((r) => r.data.data.map((i) => institutionSchema.parse(i))),
      ),
      /**
       * Reference: https://technical-docs.onebrick.io/reference/transaction-list
       *
       * Example: CLIENT=<client-name> tsx <dir-cli> getTransactions --from 2022-06-01 --to 2022-07-10 --accessToken 'access-sandbox-78ce0669-d9fc-495f-b3ab-f19534143932' //Default value is date as of the API request minus 3 months
       */
      getTransactions: zFunction(inputOneBrickTransactionSchema, (params) => {
        const today = DateTime.local()
        const start_date = today.minus({month: 3}).toISODate()
        const end_date = today.toISODate()
        const from = params.from ?? start_date
        const to = params.to ?? end_date
        return fromToken(params.accessToken ?? '')
          .get<{data: unknown[]}>('/transaction/list', {
            params: {...params, from, to},
          })
          .then((r) => r.data.data.map((i) => transactionBrickSchema.parse(i)))
      }),

      /**
     * Reference: https://technical-docs.onebrick.io/reference/account-list
     *
     * Example:
   * Example:
     * Example:
     - CLIENT=<client-name> tsx <dir-cli> getAccountList --accessToken 'access-sandbox-dbd3d177-66b1-43ca-8b63-76d9f1e08666'
     - CLIENT=<client-name> tsx <dir-cli> getAccountList --accessToken 'access-sandbox-b8f1ca81-18b3-4205-b6c2-92c4e175c38a' //OVO
    */
      getAccountList: zFunction(z.object(inputTokenSchema), (params) =>
        fromToken(params.accessToken ?? '')
          .get<{data: unknown[]}>('/account/list')
          .then((r) => r.data.data.map((i) => accountItemSchema.parse(i))),
      ),

      /**
     * Reference: https://technical-docs.onebrick.io/reference/account-detail
     *
     * Example:
   * Example:
     * Example:
      - CLIENT=<client-name> tsx <dir-cli> --accessToken 'access-sandbox-6b4dcc1d-2077-401e-893a-dcc08695be26' getAccountDetail --accountId '553318600'
      - CLIENT=<client-name> tsx <dir-cli> --accessToken 'access-sandbox-b8f1ca81-18b3-4205-b6c2-92c4e175c38a' getAccountDetail --accountId '0001100752595017' //OVO
    */
      getAccountDetail: zFunction(
        inputAccountSchema.extend(inputTokenSchema),
        (params) =>
          fromToken(params.accessToken ?? '')
            .get<{data: unknown[]}>('/account/list')
            .then((r) => r.data.data.map((i) => accountItemSchema.parse(i))),
      ),

      *iterateAllTransactions(params: typeof inputOneBrickTransactionSchema) {
        const today = DateTime.local()
        const {
          from = today.minus({month: 1}).toISODate(),
          to = today.toISODate(),
        } = inputOneBrickTransactionSchema.parse(params)

        while (true) {
          const transactions = this.getTransactions({
            ...params,
            from,
            to,
          })
          yield transactions
          break
        }
      },
    }
  },
)
