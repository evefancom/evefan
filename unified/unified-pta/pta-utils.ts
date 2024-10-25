import type {
  Amount,
  Brand,
  DisplayOf,
  DistributiveOmit,
  EnumOf,
} from '@openint/util'
import {objectFromArray, startCase, temp_makeId} from '@openint/util'
import {z} from '@openint/vdk'
import type * as Pta from './pta-types'

export function stdTypeAndEntity<T extends Pta.TypeAndEntity[0]>(
  entityName: T,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  entity: Extract<Pta.TypeAndEntity, readonly [T, any]>[1],
): // eslint-disable-next-line @typescript-eslint/no-explicit-any
[T, Extract<Pta.TypeAndEntity, readonly [T, any]>[1]] {
  return [entityName, entity]
}

export const zResourceStatus = z.enum(['connected', 'disconnected', 'error'])
export const zReviewStatus = z.enum(['unreviewed', 'reviewed', 'flagged'])
export const zAccountType = z.enum([
  'asset',
  'asset/contra_asset',
  'asset/cce', // Cash & Cash equivalent
  'asset/inventory',
  'asset/prepaid_expenses',
  'asset/cash',
  'asset/bank',
  'asset/digital_wallet', // WeChat, PayPal, Venmo, Ovo, GoPay
  'asset/accounts_receivable',
  'asset/payroll_receivable',
  'asset/iou_receivable', // https://www.investopedia.com/terms/i/iou.asp Could easily be a liability with negative bal
  'asset/real_estate',
  'asset/crypto',
  'asset/brokerage',
  'asset/insurance',
  'asset/startup_equity',
  'asset/angel_investment',
  'asset/rewards', // Rewards & Gift Cards
  'asset/security_deposit',
  'asset/clearing',
  'liability',
  'liability/contra_liability',
  'liability/accounts_payable',
  'liability/iou_payable',
  'liability/payroll_payable',
  'liability/accured_expenses', // Inverse of prepaid expenses
  'liability/unearned_revenue', // Aka Deferred Income. Diff inverse of prepaid expenses
  'liability/credit_card',
  'liability/student_loan',
  'liability/personal_loan',
  'liability/auto_loan',
  'liability/mortgage',
  'liability/taxes',
  'liability/clearing',
  'equity',
  'equity/contra_equity',
  'equity/unknown',
  'equity/uncategorized',
  'equity/clearing',
  'equity/trading',
  'equity/initial_balance',
  'equity/paid_in_capital',
  'equity/retained_earnings',
  'equity/rounding_error',
  'income',
  'income/contra_income',
  'income/revenue',
  'income/salary',
  'income/dividends',
  'income/interest',
  'income/realized_gains',
  'income/rewards',
  'income/uncategorized',
  'income/clearing',
  'expense',
  'expense/contra_expense',
  'expense/cogs',
  'expense/transaction_fee',
  'expense/interest',
  'expense/taxes',
  'expense/depreciation',
  'expense/amortization',
  'expense/realized_losses',
  'expense/clearing',
  'expense/uncategorized',
])

// MARK: - Deprecated helpers

export const RESOURCE_STATUSES = zResourceStatus.Enum
export const REVIEW_STATUSES = zReviewStatus.enum
export const ACCOUNT_TYPES = zAccountType.Enum

export const RESOURCE_STATUS_DISPLAY: DisplayOf<Pta.ResourceStatus> = {
  connected: 'Connected',
  disconnected: 'Disconnected',
  error: 'Error',
}

// TODO: Use Record<Type, Info> for things like descriptions and other metadata
// And consolidate the need for both both XXX_TYPE and XXX_TYPE_DISPLAY

export const ACCOUNT_TYPE_DISPLAY: DisplayOf<Pta.AccountType> = {
  asset: '',
  'asset/cash': '',
  'asset/cce': 'Cash & Cash Equivalent',
  'asset/inventory': '',
  'asset/bank': '',
  'asset/accounts_receivable': '',
  'asset/digital_wallet': '',
  'asset/real_estate': '',
  'asset/crypto': '',
  'asset/insurance': '',
  'asset/brokerage': '',
  'asset/startup_equity': '',
  'asset/angel_investment': '',
  'asset/prepaid_expenses': '',
  'asset/iou_receivable': 'IOU Receivable',
  'asset/rewards': 'Rewards, Gift Cards & Merchant Credit',
  'asset/security_deposit': '',
  'asset/contra_asset': '',
  // Shall we add uncategorized assets / liability?
  liability: '',
  'liability/credit_card': '',
  'liability/student_loan': '',
  'liability/personal_loan': '',
  'liability/auto_loan': '',
  'liability/mortgage': '',
  'liability/accounts_payable': '',
  'liability/iou_payable': 'IOU Payable',
  'liability/taxes': 'Tax Liabilities',
  'liability/contra_liability': '',
  income: '',
  'income/revenue': '',
  'income/rewards': '',
  'income/salary': '',
  'income/dividends': 'Dividends Income',
  'income/interest': 'Interest Income',
  'income/realized_gains': '',
  'income/uncategorized': 'Uncategorized Income',
  'income/contra_income': '',
  expense: '',
  'expense/transaction_fee': '',
  'expense/realized_losses': '',
  'expense/uncategorized': 'Uncategorized Expense',
  'expense/contra_expense': '',
  'expense/amortization': '',
  'expense/cogs': '',
  'expense/depreciation': '',
  'expense/interest': '',
  equity: '',
  'equity/unknown': '',
  'equity/uncategorized': 'Uncategorized Equity',
  'equity/clearing': '',
  'equity/trading': '',
  'equity/initial_balance': '',
  'equity/contra_equity': '',
  'equity/paid_in_capital': '',
  'equity/retained_earnings': '',
  'asset/payroll_receivable': '',
  'expense/taxes': '',
  'liability/accured_expenses': '',
  'liability/payroll_payable': '',
  'liability/unearned_revenue': '',
  'asset/clearing': '',
  'expense/clearing': '',
  'income/clearing': '',
  'liability/clearing': '',
  'equity/rounding_error': '',
}

export const ACCOUNT_SUPERTYPE_DISPLAY: DisplayOf<Pta.AccountSupertype> = {
  asset: '',
  liability: '',
  income: '',
  expense: '',
  equity: '',
}

// TODO: Remove special labels, labels are reserved for user space only...
export const ACCOUNT_LABELS = {
  archive: 'archive',
}

export const COMMODITY_TYPE_DISPLAY: {
  [K in Exclude<Pta.CommodityType, Brand<string, 'CommodityType'>>]: string
} = {
  stock: 'Public Stock',
  currency: 'Currency',
  crypto: 'Cryptocurrency',
  item_request: 'Item (Bill)',
  item_payment: 'Item (Top up)',
  other: 'Other',
}

// TODO: Remove special labels, labels are reserved for user space only...
export const TRANSACTION_LABELS = {
  padding: 'balance-padding',
  assertion: 'balance-assertion',
  pending: 'pending',
}

export const STD_BALANCE_KEYS: EnumOf<keyof Pta.Balance> = {
  alwaysGenerateTransaction: 'alwaysGenerateTransaction',
  attachmentsMap: 'attachmentsMap',
  autoShiftPaddingDate: 'autoShiftPaddingDate',
  custom: 'custom',
  date: 'date',
  description: 'description',
  disabled: 'disabled',
  holdings: 'holdings',
  id: 'id',
  labelsMap: 'labelsMap',
  variant: 'variant',
}

export const STD_ACCOUNT_KEYS: EnumOf<keyof Pta.Account> = {
  id: 'id',
  custom: 'custom',
  name: 'name',
  type: 'type',
  subtype: 'subtype',
  number: 'number',
  lastFour: 'lastFour',
  integrationName: 'integrationName',
  countryCode: 'countryCode',
  icon: 'icon',
  openDate: 'openDate',
  closeDate: 'closeDate',
  notes: 'notes',
  defaultUnit: 'defaultUnit',
  balancesMap: 'balancesMap',
  informationalBalances: 'informationalBalances',
  labelsMap: 'labelsMap',
  attachmentsMap: 'attachmentsMap',
  removed: 'removed',
}

export const STD_TRANSACTION_KEYS: EnumOf<keyof Pta.Transaction> = {
  id: 'id',
  date: 'date',
  payee: 'payee',
  description: 'description',
  externalCategory: 'externalCategory',
  notes: 'notes',
  postingsMap: 'postingsMap',
  pendingTransactionExternalId: 'pendingTransactionExternalId',
  labelsMap: 'labelsMap',
  attachmentsMap: 'attachmentsMap',
  removed: 'removed',
  transferId: 'transferId',
  custom: 'custom',
  externalStatus: 'externalStatus',
  reviewStatus: 'reviewStatus',
}

export const STD_POSTING_KEYS: EnumOf<keyof Pta.Posting> = {
  date: 'date',
  sortKey: 'sortKey',
  type: 'type',
  accountId: 'accountId',
  accountExternalId: 'accountExternalId',
  accountName: 'accountName',
  accountType: 'accountType',
  subAccountKey: 'subAccountKey',
  memo: 'memo',
  payee: 'payee',
  accrual: 'accrual',
  amount: 'amount',
  cost: 'cost',
  price: 'price',
  labelsMap: 'labelsMap',
  attachmentsMap: 'attachmentsMap',
  custom: 'custom',
}

export const STD_COMMODITY_KEYS: EnumOf<keyof Pta.Commodity> = {
  id: 'id',
  unit: 'unit',
  icon: 'icon',
  name: 'name',
  type: 'type',
  description: 'description',
  exponent: 'exponent',
  pricesMap: 'pricesMap',
  labelsMap: 'labelsMap',
  attachmentsMap: 'attachmentsMap',
}

export const STD_PRICE_KEYS: EnumOf<keyof Pta.Price> = {
  baseUnit: 'baseUnit',
  attachmentsMap: 'attachmentsMap',
  custom: 'custom',
  id: 'id',
  labelsMap: 'labelsMap',
  date: 'date',
  quote: 'quote',
  description: 'description',
}

export const STD_AMOUNT_KEYS: EnumOf<keyof Amount> = {
  quantity: 'quantity',
  unit: 'unit',
  meta: 'meta',
}

// TODO: Create a single ACCOUNT_TYPES map that contains name
// and description and everything else
export function defaultAccountNotesForType(type: Pta.AccountType) {
  switch (type) {
    case 'equity/initial_balance':
      return `
    This category is automaticaly managed by Openint based on the current balance of your accounts
    and the history of transactions.
    `
  }
  return undefined
}

/**
 * Can be used as default `Account.name`
 * TODO: `AccountType` component should use `/` to indicate hierarchy though
 * even if it's not part of the formatted type
 */
export function formatAccountType(
  type: Pta.AccountType,
  style: 'short' | 'full' = 'full',
) {
  const display = ACCOUNT_TYPE_DISPLAY[type]
  const [supertype, subtype] = splitAccountType(type)
  return [
    style !== 'short' && formatAccountSupertype(supertype),
    display || (subtype && formatAccountSubtype(subtype)),
  ]
    .filter((s) => !!s)
    .join(': ')

  // if (ACCOUNT_TYPE_DISPLAY[type]) {
  //   return ACCOUNT_TYPE_DISPLAY[type]
  // }
  // const str = type.split('/').pop()
  // return startCase(str ?? '')
}

export function formatAccountSupertype(t: Pta.AccountSupertype) {
  return startCase(t)
}

export function formatAccountSubtype(t: Pta.AccountSubtype) {
  if (t === t.toLowerCase()) {
    return startCase(t)
  }
  return t
}

export function splitAccountType(
  type: Pta.AccountType,
): [Pta.AccountSupertype, Pta.AccountSubtype | undefined] {
  const [_supertype, ...rest] = type.split('/')
  const supertype = _supertype as Pta.AccountSupertype
  const subtype = (rest.join('/') || undefined) as
    | Pta.AccountSubtype
    | undefined
  return [supertype, subtype]
}

export function makePostingsMap<T extends Pta.PostingsMap>(
  // DO we need distributive pick here?
  special: Pick<T, keyof Pta.SpecialPostingsMap>,
  other?: Partial<DistributiveOmit<T, keyof Pta.SpecialPostingsMap>>,
): T {
  return {...other, ...special} as T
}

/**
 * Allow multiple main postings hack
 */
export function makePostingsMapNext<T extends Pta.PostingsMap>(
  {
    mains = [],
    remainder,
  }: {
    mains?: Array<NonNullable<T['main']>>
    remainder?: T['remainder']
  },
  other?: Omit<T, keyof Pta.SpecialPostingsMap>,
): T {
  const mainMap = objectFromArray(mains, (p) =>
    (mains.length ?? 0) > 1 ? `main___${p.amount.unit}` : 'main',
  )
  return makePostingsMap(
    // There may *not* be a main posting. irritatingly
    // Should we insert mutliple transactions to address this?
    {remainder},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
    {...mainMap, ...other} as any,
  )
}

export function makePriceKey(quoteUnit: Unit, date: ISODate) {
  return temp_makeId('prce', `${quoteUnit}_${date}`)
}
