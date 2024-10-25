import {type QBOSDK, type QBOSDKTypes} from '@openint/connector-qbo'
import {mapper, zCast} from '@openint/vdk'
import type {AccountingAdapter} from '../router'
import * as unified from '../unifiedModels'
import {makeUlid} from '@openint/util'

type QBO = QBOSDKTypes['oas']['components']['schemas']

const mappers = {
  account: mapper(zCast<QBO['Account']>(), unified.account, {
    id: 'Id',
    name: 'Name',
    type: 'Classification',
    // number: 'AccountType'
  }),
  expense: mapper(zCast<QBO['Purchase']>(), unified.expense, {
    id: 'Id',
    amount: 'TotalAmt',
    currency: 'CurrencyRef.value',
    payment_account: 'AccountRef.value',
  }),
  vendor: mapper(zCast<QBO['Vendor']>(), unified.vendor, {
    id: 'Id',
    name: 'DisplayName',
    url: 'domain',
  }),
  balanceSheet: mapper(zCast<{data: QBO['Report']}>(), unified.balanceSheet, {
    reportName: (e) => e?.data?.Header?.ReportName ?? '',
    startPeriod: (e) => e?.data?.Header?.StartPeriod ?? '',
    endPeriod: (e) => e?.data?.Header?.EndPeriod ?? '',
    currency: (e) => e?.data?.Header?.Currency ?? 'USD',
    accountingStandard: (e) =>
      e?.data?.Header?.Option?.find((opt) => opt.Name === 'AccountingStandard')
        ?.Value ?? '',
    totalCurrentAssets: (e) =>
      Number.parseFloat(
        e?.data?.Rows?.Row[0]?.Rows?.Row[0]?.Summary?.ColData[1]?.value || '0',
      ),
    totalFixedAssets: (e) =>
      Number.parseFloat(
        e?.data?.Rows?.Row[0]?.Rows?.Row[1]?.Summary?.ColData[1]?.value || '0',
      ),
    totalAssets: (e) =>
      Number.parseFloat(
        e?.data?.Rows?.Row[0]?.Summary?.ColData[1]?.value || '0',
      ),
    totalCurrentLiabilities: (e) =>
      Number.parseFloat(
        e?.data?.Rows?.Row[1]?.Rows?.Row[0]?.Summary?.ColData[1]?.value || '0',
      ),
    totalLongTermLiabilities: (e) =>
      Number.parseFloat(
        e?.data?.Rows?.Row[1]?.Rows?.Row[1]?.Summary?.ColData[1]?.value || '0',
      ),
    totalLiabilities: (e) =>
      Number.parseFloat(
        e?.data?.Rows?.Row[1]?.Summary?.ColData[1]?.value || '0',
      ),
    openingBalanceEquity: (e) =>
      Number.parseFloat(
        // @ts-expect-error fix the `Row: Record<string, never>[]` typing inside opensdks
        e?.data?.Rows?.Row[1]?.Rows?.Row[1]?.Rows?.Row[0]?.ColData[1]?.value ||
          '0',
      ),
    netIncome: (e) =>
      Number.parseFloat(
        // @ts-expect-error fix the `Row: Record<string, never>[]` typing inside opensdks
        e?.data?.Rows?.Row[1]?.Rows?.Row[1]?.Rows?.Row[2]?.ColData[1]?.value ||
          '0',
      ),
    totalEquity: (e) =>
      Number.parseFloat(
        e?.data?.Rows?.Row[1]?.Rows?.Row[1]?.Summary?.ColData[1]?.value || '0',
      ),
    totalLiabilitiesAndEquity: (e) =>
      Number.parseFloat(
        e?.data?.Rows?.Row[1]?.Summary?.ColData[1]?.value || '0',
      ),
  }),

  profitAndLoss: mapper(zCast<{data: QBO['Report']}>(), unified.profitAndLoss, {
    reportName: (e) => e?.data?.Header?.ReportName ?? '',
    startPeriod: (e) => e?.data?.Header?.StartPeriod ?? '',
    endPeriod: (e) => e?.data?.Header?.EndPeriod ?? '',
    currency: (e) => e?.data?.Header?.Currency ?? 'USD',
    accountingStandard: (e) =>
      e?.data?.Header?.Option?.find(
        (opt: any) => opt.Name === 'AccountingStandard',
      )?.Value ?? '',
    totalIncome: (e) =>
      Number.parseFloat(
        e?.data?.Rows?.Row[0]?.Summary?.ColData[1]?.value || '0',
      ),
    grossProfit: (e) =>
      Number.parseFloat(
        e?.data?.Rows?.Row[1]?.Summary?.ColData[1]?.value || '0',
      ),
    totalExpenses: (e) =>
      Number.parseFloat(
        e?.data?.Rows?.Row[2]?.Summary?.ColData[1]?.value || '0',
      ),
    netOperatingIncome: (e) =>
      Number.parseFloat(
        e?.data?.Rows?.Row[3]?.Summary?.ColData[1]?.value || '0',
      ),
    netIncome: (e) =>
      Number.parseFloat(
        e?.data?.Rows?.Row[4]?.Summary?.ColData[1]?.value || '0',
      ),
  }),

  cashFlow: mapper(zCast<{data: QBO['Report']}>(), unified.cashFlow, {
    reportName: (e) => e?.data?.Header?.ReportName ?? '',
    startPeriod: (e) => e?.data?.Header?.StartPeriod ?? '',
    endPeriod: (e) => e?.data?.Header?.EndPeriod ?? '',
    currency: (e) => e?.data?.Header?.Currency ?? 'USD',
    netIncome: (e) =>
      Number.parseFloat(
        e?.data?.Rows?.Row?.[0]?.Rows?.Row?.[0]?.ColData?.[1]?.value || '0',
      ),
    totalOperatingAdjustments: (e) =>
      Number.parseFloat(
        e?.data?.Rows?.Row?.[0]?.Summary?.ColData?.[1]?.value || '0',
      ),
    netCashFromOperatingActivities: (e) =>
      Number.parseFloat(
        e?.data?.Rows?.Row[0]?.Summary?.ColData[1]?.value || '0',
      ),
    netCashFromFinancingActivities: (e) =>
      Number.parseFloat(
        e?.data?.Rows?.Row[1]?.Summary?.ColData[1]?.value || '0',
      ),
    netCashIncrease: (e) =>
      Number.parseFloat(
        e?.data?.Rows?.Row[2]?.Summary?.ColData[1]?.value || '0',
      ),
    endingCash: (e) =>
      Number.parseFloat(
        e?.data?.Rows?.Row[3]?.Summary?.ColData[1]?.value || '0',
      ),
  }),

  transactionList: mapper(zCast<{data: QBO['Report']}>(), unified.transactionList, {
    reportName: (e) => e?.data?.Header?.ReportName ?? '',
    startPeriod: (e) => e?.data?.Header?.StartPeriod ?? '',
    endPeriod: (e) => e?.data?.Header?.EndPeriod ?? '',
    currency: (e) => e?.data?.Header?.Currency ?? 'USD',
    transactions: (e) =>
      e?.data?.Rows?.Row?.flatMap((section) =>
        section?.Rows?.Row?.map((row) => ({
          date: row?.ColData?.[0]?.value ?? '',
          transactionType: row?.ColData?.[1]?.value ?? '',
          documentNumber: row?.ColData?.[2]?.value ?? '',
          posting: row?.ColData?.[3]?.value ?? '',
          name: row?.ColData?.[4]?.value ?? '',
          department: row?.ColData?.[5]?.value ?? '',
          memo: row?.ColData?.[6]?.value ?? '',
          account: row?.ColData?.[7]?.value ?? '',
          split: row?.ColData?.[8]?.value ?? '',
          amount: parseFloat(row?.ColData?.[9]?.value ?? '0'),
        })) ?? []
      ) ?? [],
  }),
  customerBalance: mapper(zCast<{data: QBO['Report']}>(), unified.customerBalance, {
    reportName: (e) => e?.data?.Header?.ReportName ?? '',
    reportDate: (e) =>
      e?.data?.Header?.Option?.find((opt) => opt.Name === 'report_date')?.Value ?? '',
    currency: (e) => e?.data?.Header?.Currency ?? 'USD',
    entries: (e) =>
      e?.data?.Rows?.Row?.filter((row) => !row.group)?.map((row) => ({
        customerId: row?.ColData?.[0]?.id ?? '',
        customerName: row?.ColData?.[0]?.value ?? '',
        balance: parseFloat(row?.ColData?.[1]?.value ?? '0'),
      })) ?? [],
    totalBalance: (e) =>
      parseFloat(
        e?.data?.Rows?.Row?.find((row) => row.group === 'GrandTotal')?.Summary?.ColData?.[1]?.value ?? '0'
      ),
  }),
  customerIncome: mapper(zCast<{data: QBO['Report']}>(), unified.customerIncome, {
    reportName: (e) => e?.data?.Header?.ReportName ?? '',
    startPeriod: (e) => e?.data?.Header?.StartPeriod ?? '',
    endPeriod: (e) => e?.data?.Header?.EndPeriod ?? '',
    currency: (e) => e?.data?.Header?.Currency ?? 'USD',
    entries: (e) =>
      e?.data?.Rows?.Row?.filter((row) => !row.group)?.map((row) => ({
        customerId: row?.ColData?.[0]?.id ?? '',
        customerName: row?.ColData?.[0]?.value ?? '',
        totalIncome: parseFloat(row?.ColData?.[1]?.value ?? '0'),
        totalExpenses: parseFloat(row?.ColData?.[2]?.value ?? '0'),
        netIncome: parseFloat(row?.ColData?.[3]?.value ?? '0'),
      })) ?? [],
    totalIncome: (e) =>
      parseFloat(
        e?.data?.Rows?.Row?.find((row) => row.group === 'GrandTotal')?.Summary?.ColData?.[1]?.value ?? '0'
      ),
    totalExpenses: (e) =>
      parseFloat(
        e?.data?.Rows?.Row?.find((row) => row.group === 'GrandTotal')?.Summary?.ColData?.[2]?.value ?? '0'
      ),
    netIncome: (e) =>
      parseFloat(
        e?.data?.Rows?.Row?.find((row) => row.group === 'GrandTotal')?.Summary?.ColData?.[3]?.value ?? '0'
      ),
  }),
}

export const qboAdapter = {
  listAccounts: async ({instance}) => {
    const res = await instance.getAll('Account').next()
    return {
      has_next_page: true,
      items: res.value?.entities?.map(mappers.account) ?? [],
    }
  },
  listExpenses: async ({instance}) => {
    const res = await instance.getAll('Purchase').next()
    return {
      has_next_page: true,
      items: res.value?.entities?.map(mappers.expense) ?? [],
    }
  },
  listVendors: async ({instance}) => {
    const res = await instance.getAll('Vendor').next()
    return {
      has_next_page: true,
      items: res.value?.entities?.map(mappers.vendor) ?? [],
    }
  },
  getBalanceSheet: async ({instance}) => {
    const res = await instance.GET('/reports/BalanceSheet')
    return mappers.balanceSheet(res)
  },
  getProfitAndLoss: async ({instance}) => {
    const res = await instance.GET('/reports/ProfitAndLoss')
    return mappers.profitAndLoss(res)
  },
  getCashFlow: async ({instance}) => {
    const res = await instance.GET('/reports/CashFlow')
    return mappers.cashFlow(res)
  },
  getTransactionList: async ({instance}) => {
    const res = await instance.GET('/reports/TransactionList')
    return mappers.transactionList(res)
  },
  getCustomerBalance: async ({instance}) => {
    const res = await instance.GET('/reports/CustomerBalance')
    return mappers.customerBalance(res)
  },
  getCustomerIncome: async ({instance}) => {
    const res = await instance.GET('/reports/CustomerIncome')
    return mappers.customerIncome(res)
  },
  // @ts-expect-error we can tighten up the types here after opensdks support qbo v4
  getBankAccounts: async ({instance, input, env}) => {
    // https://developer.intuit.com/app/developer/qbpayments/docs/api/resources/all-entities/bankaccounts#get-a-list-of-bank-accounts
    const res = await instance.request('GET', `/bank-accounts/${input.customer}`, {
      headers: {
        'Accept': 'application/json',
        "request-Id": makeUlid()
      }
    })
    return res.data;
  },
  // @ts-expect-error we can tighten up the types here after opensdks support qbo v4
  getPaymentReceipt: async ({instance, input}) => {
     // https://developer.intuit.com/app/developer/qbpayments/docs/api/resources/all-entities/paymentreceipt
      const res = await instance.request('GET', `/payment-receipts/${input.customer_transaction_id}`, {
        headers: {
          'Accept': 'application/pdf, application/json',
          "request-Id": makeUlid()
        }
      })
      return res.data;
  },
} satisfies AccountingAdapter<QBOSDK>
