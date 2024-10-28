import {createHTTPClient, z, zCast, zFunction} from '@openint/util'

export const zConfig = z.object({
  token: z.string(),
})

export const makeMootaClient = zFunction(zConfig, ({token}) => {
  const http = createHTTPClient({
    baseURL: 'https://app.moota.co/api/v2',
    headers: {
      'cache-control': 'no-cache',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  const listBankAccounts = zFunction(
    zCast<Moota.ListBankAccountsParams>(),
    async (params) =>
      http
        .get<Moota.ListBankAccountsResponse>('/bank', {params})
        .then((e) => e.data),
  )
  const listTransactions = zFunction(
    zCast<Moota.ListTransactionsParams>(),
    async (params) =>
      http
        .get<Moota.ListTransactionsResponse>('/mutation', {params})
        .then((e) => e.data),
  )

  async function* iterateAllBankAccounts() {
    let page = 0
    let endPage = false

    while (!endPage) {
      page++
      const bankAccount = await listBankAccounts({page})
      endPage = !bankAccount.next_page_url
      yield bankAccount
    }
  }

  async function* iterateAllTransactions(params: Moota.ListTransactionsParams) {
    let page = 0
    let endPage = false

    while (!endPage) {
      page++
      const transaction = await listTransactions({...params, page})
      endPage = !transaction.next_page_url
      yield transaction
    }
  }

  return {
    getProfile: zFunction(async () =>
      http.get<Moota.AccountProfile>('/user').then((e) => e.data),
    ),
    listBankAccounts,
    listTransactions,
    iterateAllBankAccounts,
    iterateAllTransactions,
  }
})
