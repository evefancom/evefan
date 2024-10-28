import {createHTTPClient, DateTime, z, zCast, zFunction} from '@openint/util'

export type Category = z.infer<typeof categorySchema>
export type Asset = z.infer<typeof assetSchema>
export type Transaction = z.infer<typeof transactionSchema>
export interface GetTransactionsParams {
  start_date?: ISODate
  end_date?: ISODate
  debit_as_negative?: boolean
  limit?: number
  offset?: number
}

export interface ClientConfig {
  accessToken: string
}

export const zConfig = z.object({
  accessToken: z.string(),
})
export const categorySchema = z.object({
  id: z.number(),
  description: z.string().nullish(),
  exclude_from_budget: z.boolean(),
  exclude_from_totals: z.boolean(),
  group_id: z.string().nullish(),
  is_group: z.boolean(),
  is_income: z.boolean(),
  name: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
})

/** https://lunchmoney.dev/#assets-object
{
  "id": 2898,
  "type_name": "investment",
  "subtype_name": "brokerage",
  "name": "Interactive Brokers",
  "display_name": "Kirill&#x27;s ETFs",
  "balance": "233742837.0000",
  "balance_as_of": "2022-06-15T08:03:48.000Z",
  "closed_on": null,
  "currency": "sgd",
  "institution_name": "IBKR",
  "exclude_transactions": false,
  "created_at": "2022-06-13T14:16:27.312Z"
}
 */
export const assetSchema = z.object({
  id: z.number(),
  type_name: z.string(),
  subtype_name: z.string(),
  name: z.string(),
  display_name: z.string(),
  balance: z.string(),
  /** ISO Date */
  balance_as_of: z.string(),
  /** ISO Date */
  closed_on: z.string().nullish(),
  currency: z.string(),
  institution_name: z.string(),
  exclude_transactions: z.boolean(),
  created_at: z.string(),
})

export const tagSchema = z.object({
  name: z.string(),
  id: z.number(),
})

/**
{
  "amount": "11.2",
  "asset_id": 5653,
  "category_id": 2332,
  "currency": "sgd",
  "date": "2022-01-01",
  "external_id": null,
  "fees": null,
  "group_id": null,
  "id": 1409,
  "is_group": false,
  "notes": null,
  "original_name": "Gojek",
  "parent_id": null,
  "payee": "Gojek",
  "plaid_account_id": null,
  "price": null,
  "quantity": null,
  "recurring_id": null,
  "status": "cleared",
  "subtype": null,
  "tags": null,
  "type": null
},
 */
export const transactionSchema = z.object({
  id: z.number(),
  date: z.string(),
  payee: z.string(),
  amount: z.string(),
  currency: z.string(),
  notes: z.string().nullish(),
  category_id: z.number(),
  recurring_id: z.number().nullish(),
  asset_id: z.number().nullish(),
  plaid_account_id: z.any(),
  status: z.string(),
  is_group: z.boolean(),
  group_id: z.any(),
  parent_id: z.any(),
  tags: z.array(tagSchema).nullish(),
  external_id: z.any(),
  original_name: z.string(),
  type: z.any(),
  subtype: z.any(),
  fees: z.any(),
  price: z.any(),
  quantity: z.any(),
})

/**
 * https://lunchmoney.dev/#get-all-categories
 */
export const makeLunchmoneyClient = zFunction(zConfig, ({accessToken}) => {
  const http = createHTTPClient({
    baseURL: 'https://dev.lunchmoney.app/v1',
    headers: {
      'cache-control': 'no-cache',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const getTransactions = zFunction(zCast<GetTransactionsParams>(), (params) =>
    http
      .get<{transactions: unknown[]}>('transactions', {params})
      .then((r) => r.data.transactions.map((t) => transactionSchema.parse(t))),
  )

  async function* iterateAllTransactions(params: GetTransactionsParams) {
    const today = DateTime.local()
    const {
      start_date = today.minus({year: 10}).toISODate(),
      end_date = today.toISODate(),
      limit = 500,
    } = params
    let {offset = 0} = params

    while (true) {
      const transactions = await getTransactions({
        ...params,
        start_date,
        end_date,
        limit,
        offset,
      })
      yield transactions
      if (transactions.length > 0) {
        offset += transactions.length
      } else {
        break
      }
    }
  }

  return {
    getCategories: zFunction(() =>
      http
        .get<{categories: unknown[]}>('categories')
        .then((r) => r.data.categories.map((c) => categorySchema.parse(c))),
    ),
    getAssets: zFunction(() =>
      http
        .get<{assets: unknown[]}>('assets')
        .then((r) => r.data.assets.map((a) => assetSchema.parse(a))),
    ),
    getTransactions,
    iterateAllTransactions,
  }
})
