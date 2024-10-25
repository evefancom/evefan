import type {Oas_accounting, XeroSDK} from '@openint/connector-xero'
import {mapper, zCast} from '@openint/vdk'
import type {BankingAdapter} from '../router'
import * as unified from '../unifiedModels'

type Xero = Oas_accounting['components']['schemas']

export const mappers = {
  account: mapper(zCast<Xero['Account']>(), unified.account, {
    id: 'AccountID',
    name: 'Name',
  }),
  category: mapper(zCast<Xero['Account']>(), unified.account, {
    id: 'AccountID',
    name: 'Name',
  }),
  bank_transaction: mapper(
    zCast<Xero['BankTransaction']>(),
    unified.transaction,
    {
      id: 'BankTransactionID',
      amount: 'Total',
      currency: 'CurrencyCode',
      date: 'DateString' as 'Date', // empirically works https://share.cleanshot.com/0c6dlNsF
      account_id: 'BankAccount.AccountID',
      account_name: 'BankAccount.Name',
      merchant_id: 'Contact.ContactID',
      merchant_name: 'Contact.Name',
      category_id: (t) => t.LineItems[0]?.AccountID ?? '',
      description: (t) => t.LineItems[0]?.Description ?? '',
      // Don't have data readily available for these...
      // category_name is not readily available, only ID is provided
    },
  ),
}

export const xeroAdapter = {
  listCategories: async ({instance}) => {
    // TODO: Abstract this away please...
    const tenantId = await instance.identity
      .GET('/Connections')
      .then((r) => r.data?.[0]?.tenantId)
    if (!tenantId) {
      throw new Error(
        'Missing access to any tenants. Check xero token permission',
      )
    }

    const res = await instance.accounting.GET('/Accounts', {
      params: {
        header: {'xero-tenant-id': tenantId},
        query: {
          where: 'Class=="REVENUE"||Class=="EXPENSE"',
        },
      },
    })
    return {
      has_next_page: false,
      items: (res.data.Accounts ?? []).map(mappers.category),
    }
  },
} satisfies BankingAdapter<XeroSDK>
