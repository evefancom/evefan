import type {PlaidSDK, PlaidSDKTypes} from '@openint/connector-plaid'
import {mapper, zCast} from '@openint/vdk'
import type {BankingAdapter} from '../router'
import * as unified from '../unifiedModels'

type Plaid = PlaidSDKTypes['oas']['components']

export const mappers = {
  transaction: mapper(
    zCast<Plaid['schemas']['Transaction']>(),
    unified.transaction,
    {
      id: 'transaction_id',
      amount: 'amount',
      currency: 'iso_currency_code',
      date: 'date',
      account_id: 'account_id',
      category_name: (p) =>
        [
          p.personal_finance_category?.primary,
          p.personal_finance_category?.detailed,
        ]
          .filter((c) => !!c)
          .join('/'),
      description: 'original_description',
      merchant_id: 'merchant_entity_id',
      merchant_name: 'merchant_name',
    },
  ),
  account: mapper(zCast<Plaid['schemas']['AccountBase']>(), unified.account, {
    id: 'account_id',
    name: 'name',
    current_balance: (a) => a.balances.current ?? undefined,
    currency: (a) => a.balances.iso_currency_code ?? undefined,
  }),
  category: mapper(zCast<Plaid['schemas']['Category']>(), unified.category, {
    id: 'category_id',
    name: (c) => c.hierarchy.join('/'),
  }),
}

export const plaidAdapter = {
  listCategories: async ({instance}) => {
    // TODO: use the new personal finance categories , but not supported by this endpoint
    // so will need to figure it out.
    // Also this endpoint does not even require authentication...
    const res = await instance.POST('/categories/get', {body: {}})
    return {
      has_next_page: false,
      items: (res.data.categories ?? []).map(mappers.category),
    }
  },
  listTransactions: async ({instance}) => {
    const res = await instance.POST('/transactions/sync', {
      body: {access_token: instance.accessToken},
    })
    // TODO: Fully implement this...
    return {
      has_next_page: false,
      items: (res.data.added ?? []).map(mappers.transaction),
    }
  },
} satisfies BankingAdapter<PlaidSDK & {accessToken: string}>
