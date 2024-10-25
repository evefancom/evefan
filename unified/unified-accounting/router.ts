import type {AdapterFromRouter, RouterMeta} from '@openint/vdk'
import {
  proxyCallAdapter,
  trpc,
  verticalProcedure,
  z,
  zPaginatedResult,
  zPaginationParams,
} from '@openint/vdk'
import adapters from './adapters'
import * as unified from './unifiedModels'

export {unified}

function oapi(meta: NonNullable<RouterMeta['openapi']>): RouterMeta {
  return {openapi: {...meta, path: `/unified/accounting${meta.path}`}}
}

const procedure = verticalProcedure(adapters)

// Define base query parameters common to most reports
const baseReportQueryParams = z.object({
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  sort_order: z.string().optional(),
  customer: z.string().optional(),
  department: z.string().optional(),
  date_macro: z.string().optional(),
})

export const accountingRouter = trpc.router({
  // MARK: - Account
  listAccounts: procedure
    .meta(oapi({method: 'GET', path: '/account'}))
    .input(zPaginationParams.nullish())
    .output(zPaginatedResult.extend({items: z.array(unified.account)}))
    .query(async ({input, ctx}) => proxyCallAdapter({input, ctx})),
  listExpenses: procedure
    .meta(oapi({method: 'GET', path: '/expense'}))
    .input(zPaginationParams.nullish())
    .output(zPaginatedResult.extend({items: z.array(unified.expense)}))
    .query(async ({input, ctx}) => proxyCallAdapter({input, ctx})),
  listVendors: procedure
    .meta(oapi({method: 'GET', path: '/vendor'}))
    .input(zPaginationParams.nullish())
    .output(zPaginatedResult.extend({items: z.array(unified.vendor)}))
    .query(async ({input, ctx}) => proxyCallAdapter({input, ctx})),
  getBalanceSheet: procedure
    .meta(oapi({method: 'GET', path: '/balance-sheet'}))
    .input(baseReportQueryParams.extend({
      summarize_by: z.string().optional(),
    }))
    .output(unified.balanceSheet)
    .query(async ({input, ctx}) => proxyCallAdapter({input, ctx})),
  getProfitAndLoss: procedure
    .meta(oapi({method: 'GET', path: '/profit-and-loss'}))
    .input(baseReportQueryParams.extend({}))
    .output(unified.profitAndLoss)
    .query(async ({input, ctx}) => proxyCallAdapter({input, ctx})),
  getCashFlow: procedure
    .meta(oapi({method: 'GET', path: '/cash-flow'}))
    .input(baseReportQueryParams.extend({
      summarize_by: z.string().optional(),
    }))
    .output(unified.cashFlow)
    .query(async ({input, ctx}) => proxyCallAdapter({input, ctx})),
  getTransactionList: procedure
    .meta(oapi({method: 'GET', path: '/transaction-list'}))
    .input(baseReportQueryParams.extend({
      // leaving open not to create too specific of an API
    }))
    .output(unified.transactionList)
    .query(async ({input, ctx}) => proxyCallAdapter({input, ctx})),
  getCustomerBalance: procedure
    .meta(oapi({method: 'GET', path: '/customer-balance'}))
    .input(baseReportQueryParams.extend({
      summarize_by: z.string().optional(),
    }))
    .output(unified.customerBalance)
    .query(async ({input, ctx}) => proxyCallAdapter({input, ctx})),
  getCustomerIncome: procedure
    .meta(oapi({method: 'GET', path: '/customer-income'}))
    .input(baseReportQueryParams.extend({
      summarize_by: z.string().optional(),
    }))
    .output(unified.customerIncome)
    .query(async ({input, ctx}) => proxyCallAdapter({input, ctx})),
  getBankAccounts: procedure
    .meta(oapi({method: 'GET', path: '/bank-accounts'}))
    .input(z.object({customer: z.string()}))
    .output(z.array(unified.usBankAccount))
    .query(async ({input, ctx}) => proxyCallAdapter({input, ctx})),
  getPaymentReceipts: procedure
    .meta(oapi({method: 'GET', path: '/payment-receipt'}))
    .input(z.object({customer_transaction_id: z.string()}))
    .output(z.instanceof(Buffer))
    .query(async ({input, ctx}) => proxyCallAdapter({input, ctx})),
})

export type AccountingAdapter<TInstance> = AdapterFromRouter<
  typeof accountingRouter,
  TInstance
>
