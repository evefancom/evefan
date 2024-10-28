import {z} from '@openint/vdk'

export const account = z.object({
  id: z.string(),
  number: z.string().nullish(),
  name: z.string(),
  type: z.string(), //  z.enum(['asset', 'liability', 'equity', 'income', 'expense']),
})
// .openapi({format: 'prefix:acct'}),
export const expense = z.object({
  id: z.string(),
  amount: z.number(),
  currency: z.string(),
  payment_account: z.string(),
})
// .openapi({format: 'prefix:exp'}),
export const vendor = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
})
// .openapi({format: 'prefix:ven'}),

// TODO: expand
export const balanceSheet = z.object({
  startPeriod: z.string().openapi({format: 'date'}),
  endPeriod: z.string().openapi({format: 'date'}),
  currency: z.string(),
  accountingStandard: z.string(),
  totalCurrentAssets: z.number().nullable(),
  totalFixedAssets: z.number().nullable(),
  totalAssets: z.number().nullable(),
  totalCurrentLiabilities: z.number().nullable(),
  totalLongTermLiabilities: z.number().nullable(),
  totalLiabilities: z.number().nullable(),
  openingBalanceEquity: z.number().nullable(),
  netIncome: z.number().nullable(),
  totalEquity: z.number().nullable(),
  totalLiabilitiesAndEquity: z.number().nullable(),
})

// TODO: expand
export const profitAndLoss = z.object({
  reportName: z.string(),
  startPeriod: z.string().openapi({format: 'date'}),
  endPeriod: z.string().openapi({format: 'date'}),
  currency: z.string(),
  accountingStandard: z.string(),
  totalIncome: z.number().nullable(),
  grossProfit: z.number().nullable(),
  totalExpenses: z.number().nullable(),
  netOperatingIncome: z.number().nullable(),
  netIncome: z.number().nullable(),
})

export const cashFlow = z.object({
  reportName: z.string(),
  startPeriod: z.string().openapi({format: 'date'}),
  endPeriod: z.string().openapi({format: 'date'}),
  currency: z.string(),
  netIncome: z.number().nullable(),
  totalOperatingAdjustments: z.number().nullable(),
  netCashFromOperatingActivities: z.number().nullable(),
  netCashFromFinancingActivities: z.number().nullable(),
  netCashIncrease: z.number().nullable(),
  endingCash: z.number().nullable(),
})

const transactionSchema = z.object({
  date: z.string(),
  transactionType: z.string(),
  documentNumber: z.string().optional(),
  posting: z.string().optional(),
  name: z.string().optional(),
  department: z.string().optional(),
  memo: z.string().optional(),
  account: z.string().optional(),
  split: z.string().optional(),
  amount: z.number(),
});

export const transactionList = z.object({
  reportName: z.string(),
  startPeriod: z.string(),
  endPeriod: z.string(),
  currency: z.string(),
  transactions: z.array(transactionSchema),
});

const customerBalanceEntrySchema = z.object({
  customerId: z.string(),
  customerName: z.string(),
  balance: z.number(),
});

export const customerBalance = z.object({
  reportName: z.string(),
  reportDate: z.string(),
  currency: z.string(),
  entries: z.array(customerBalanceEntrySchema),
  totalBalance: z.number(),
});

const customerIncomeEntrySchema = z.object({
  customerId: z.string(),
  customerName: z.string(),
  totalIncome: z.number(),
  totalExpenses: z.number(),
  netIncome: z.number(),
});

export const customerIncome = z.object({
  reportName: z.string(),
  startPeriod: z.string(),
  endPeriod: z.string(),
  currency: z.string(),
  entries: z.array(customerIncomeEntrySchema),
  totalIncome: z.number(),
  totalExpenses: z.number(),
  netIncome: z.number(),
});

export const usBankAccount = z.object({
  updated: z.string(),
  name: z.string(),
  accountNumber: z.string(),
  default: z.boolean(),
  created: z.string(),
  inputType: z.string(),
  phone: z.string(),
  accountType: z.string(),
  routingNumber: z.string(),
  id: z.string(),
});