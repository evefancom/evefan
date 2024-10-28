import type {QBOSDK, QBOSDKTypes} from '@openint/connector-qbo'
import {mapper, zCast} from '@openint/vdk'
import type {BankingAdapter} from '../router'
import * as unified from '../unifiedModels'

type QBO = QBOSDKTypes['oas']['components']['schemas']

export const mappers = {
  purchase: mapper(zCast<QBO['Purchase']>(), unified.transaction, {
    id: 'Id',
    amount: 'TotalAmt',
    currency: 'CurrencyRef.value',
    date: 'TxnDate',
    account_id: 'AccountRef.value',
    account_name: 'AccountRef.name',
    // This is a significant approximation, as there can also be ItemBasedLineDetail as well as
    // multiple lines... However we sit with it for now...
    category_id: (p) =>
      p.Line[0]?.AccountBasedExpenseLineDetail?.AccountRef.value,
    category_name: (p) =>
      p.Line[0]?.AccountBasedExpenseLineDetail?.AccountRef.name,
    description: (p) => p.Line[0]?.Description,
    merchant_id: 'EntityRef.value',
    merchant_name: 'EntityRef.name',
  }),
  account: mapper(zCast<QBO['Account']>(), unified.account, {
    id: 'Id',
    name: 'FullyQualifiedName',
  }),
  category: mapper(zCast<QBO['Account']>(), unified.category, {
    id: 'Id',
    name: 'FullyQualifiedName',
  }),
  vendor: mapper(zCast<QBO['Vendor']>(), unified.merchant, {
    id: 'Id',
    name: 'DisplayName',
  }),
}

export const qboAdapter = {
  listCategories: async ({instance}) => {
    const res = await instance.query(
      // QBO API does not support OR in SQL query...
      "SELECT * FROM Account WHERE Classification IN ('Revenue', 'Expense') MAXRESULTS 1000",
    )
    return {
      has_next_page: false,
      items: (res.Account ?? []).map(mappers.category),
    }
  },
} satisfies BankingAdapter<QBOSDK>
