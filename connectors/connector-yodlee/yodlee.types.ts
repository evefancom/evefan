import type {YodleeSDKTypes} from '@opensdks/sdk-yodlee'
import {z, zCast} from '@openint/util'

type components = YodleeSDKTypes['oas']['components']

// TODO: Deprecate most of me and use the types generated from openAPI

export type YodleeBalances = Partial<
  Pick<
    YodleeAccount,
    | 'cash'
    | 'balance'
    | 'balance'
    | 'remainingBalance'
    | 'currentBalance'
    | 'annuityBalance'
    | 'availableBalance'
    | 'availableCredit'
    | 'availableCash'
  >
>

// Models

export const zYodleeAmount = z.object({
  amount: z.number(),
  currency: z.string(),
})

export const zPrice = z.object({
  amount: z.number(),
  currency: z.string(),
})

export const zContainer = z.enum([
  'bank',
  'creditCard',
  'investment',
  'insurance',
  'loan',
  'otherAssets',
  'otherLiabilities',
  'realEstate',
  'reward',
  'bill',
  /** Not sure if these actually get returned separately or part of investment */
  'investment (SN 1.0)',
  'investment (SN 2.0)',
])

export const zCategoryType = z.enum([
  'TRANSFER',
  'DEFERRED_COMPENSATION',
  'UNCATEGORIZE',
  'INCOME',
  'EXPENSE',
])

export type YodleeTransaction = z.infer<typeof zYodleeTransaction>
export const zYodleeTransaction = z.object({
  accountId: z.number(),
  amount: zYodleeAmount,
  baseType: z.enum(['DEBIT', 'CREDIT']),
  type: z.enum(['BUY', 'SELL']).nullish(),
  category: z.string(),
  categoryId: z.number(),
  categorySource: z.enum(['SYSTEM', 'USER']),
  categoryType: zCategoryType,
  CONTAINER: zContainer,
  createdDate: z.string(),
  date: z.string(),
  description: z.object({
    original: z.string(),
    consumer: z.string(),
    simple: z.string(),
  }),
  id: z.number(),
  isManual: z.boolean(),
  highLevelCategoryId: z.number(),
  lastUpdated: z.string(),
  merchant: z
    .object({
      categoryLabel: z.string().array(),
      id: z.number(),
      name: z.string(),
    })
    .nullish(),
  postDate: z.string(),
  quantity: z.number().nullish(),
  sourceType: z.enum(['YODLEE', 'FACTUAL']),
  price: zPrice,
  status: z.enum(['POSTED', 'PENDING', 'SCHEDULED', 'FAILED']),
  symbol: z.string().nullish(),
  transactionDate: z.string(),
  isDeleted: z.boolean(),
})

export type YodleeAccount = z.infer<typeof zYodleeAccount> & {
  _id: ExternalId
  _balancesMap?: Record<
    ISODate,
    {
      /** USD Balances. If holdings exist, this is the value of holdings */
      balances: YodleeBalances
      holdings: Yodlee.HoldingWithSecurity[]
    }
  >
}
export const zYodleeAccount = z.object({
  accountName: z.string(),
  accountNumber: z.string().nullish(),
  accountType: z.string(),
  accountStatus: z.enum(['ACTIVE', 'INACTIVE', 'TO_BE_CLOSED', 'CLOSED']),
  aggregationSource: z.enum(['SYSTEM', 'USER']),
  amountDue: zYodleeAmount,
  annuityBalance: zYodleeAmount,
  availableBalance: zYodleeAmount,
  availableCash: zYodleeAmount,
  availableCredit: zYodleeAmount,
  balance: zYodleeAmount,
  cash: zYodleeAmount,
  classification: z.enum([
    'CORPORATE',
    'OTHER',
    'PERSONAL',
    'SMALL_BUSINESS',
    'TRUST',
    'VIRTUAL_CARD',
    'ADD_ON_CARD',
  ]),
  createdDate: z.string(),

  CONTAINER: zContainer,
  currentBalance: zYodleeAmount.nullish(),
  dueDate: z.string(),
  displayedName: z.string(),
  expirationDate: z.string(),
  id: z.number(),
  includeInNetWorth: z.boolean(),
  isAsset: z.boolean(),
  isManual: z.boolean(),
  interestRate: z.number(),
  lastPayment: zYodleeAmount,
  lastPaymentAmount: zYodleeAmount,
  lastPaymentDate: z.string(),
  lastUpdated: z.string(),
  memo: z.string().nullish(),
  minimumAmountDue: zYodleeAmount,
  nickname: z.string().nullish(),
  providerAccountId: z.number(),
  providerId: z.string(),
  providerName: z.string(),
  remainingBalance: zYodleeAmount,
  totalCashLimit: zYodleeAmount,
  totalCreditLine: zYodleeAmount,
  userClassification: z.enum(['PERSONAL', 'BUSINESS']),
  isDeleted: z.boolean().nullish(),
})

export const zYodleeInstitution = zCast<components['schemas']['Institution']>()

/** TODO: Extract me into zod-utils - zod from JSONSchema */
export const zYodleeProvider = zCast<components['schemas']['ProviderDetail']>()

/**
 * e.g.
 * currency: 'USD'
 * timeZone: 'PST'
 * dateFormat: 'MM/dd/yyyy'
 */
export const zUser = zCast<components['schemas']['UserDetail']>()

export const zProviderAccount = z.object({
  aggregationSource: z.string(),
  createdDate: z.string(),
  dataset: z.array(z.any()), // TODO: Change it with Yodlee.Dataset
  id: z.number(),
  isManual: z.boolean(),
  providerId: z.number(),
  status: z.enum([
    'LOGIN_IN_PROGRESS',
    'USER_INPUT_REQUIRED',
    'IN_PROGRESS',
    'PARTIAL_SUCCESS',
    'SUCCESS',
    'FAILED',
  ]),
  isDeleted: z.boolean().nullish(),
})

// Params

export const zGetTransactionParams = z.object({
  /** bank/creditCard/investment/insurance/loan	query	String */
  container: zContainer.nullish(),
  /** DEBIT/CREDIT	query	String */
  baseType: z.string().nullish(),
  /** Transaction search text	query	String */
  keyword: z.string().nullish(),
  /** Comma separated accountIds	query	String */
  accountId: z.string(),
  /** Transaction from date(YYYY-MM-DD)	query	String */
  fromDate: z.string().nullish(),
  /** Transaction end date (YYYY-MM-DD)	query	String */
  toDate: z.string().nullish(),
  /** Comma separated categoryIds	query	String */
  categoryId: z.string().nullish(),
  /** Comma separated highLevelCategoryIds	query	String */
  highLevelCategoryId: z.string().nullish(),
  /** Transaction Type(Supported containers: bank/card/investment)	query	String */
  type: z.string().nullish(),
  /** Transaction Category Type(UNCATEGORIZE, INCOME, TRANSFER, EXPENSE or DEFERRED_COMPENSATION)	query	String */
  categoryType: zCategoryType.nullish(),
  /** UNRECONCILED(Default value),RECONCILED	query	String */
  accountReconType: z.string().nullish(),
  /** skip (Min 0)	query	Integer */
  skip: z.number().nullish(),
  /** top (Max 500)	query	Integer */
  top: z.number().nullish(),
  /** Comma separated detailCategoryIds	query	String */
  detailCategoryId: z.string().nullish(),
})

export type YodleeGetTransactionParams = z.infer<typeof zGetTransactionParams>

/**
 * Yodlee sandbox keys
 * https://share.getcloudapp.com/YEupD0rP
 * https://developer.yodlee.com/assets/images/OTP_Documents/Yodlee%20Dummy%20Account%20Generator%20User%20Guide%20v12.0.pdf
Site	Sum Info	Nickname	Username	Password
Dagbank	11195	DAG101	DAG101.bank1	bankl
Dagbank	11195	DAG101	DAG101.bank2	bank2
DagMiles	11196	DAG101	DAG101.Miles2	Miles2
DagMiles	11196	DAG101	DAG101.Miles1	Miles2
Daglnsurance	11197	DAG101	DAG101.Insurance1	Insurance1
Daglnsurance	11197	DAG101	DAG101.Insurance2	Insurance2
DagcreditCard	11198	DAG101	DAG101.creditCard1	creditCard2
DagcreditCard	11198	DAG101	DAG101.creditCard2	creditCard1
DagLoans	11199	DAG101	DAG101.Loans1	Loans2
DagLoans	11199	DAG101	DAG101.Loans2	Loans1
DagBills	11200	DAG101	DAG101.Bills1	Bills1
DagBills	11200	DAG101	DAG101.Bills2	Bills2
DagInvestment	11201	DAG101	DAG101.Investment1	Investment1
DagInvestment	11201	DAG101	DAG101.Investment2	Investment2
DagSecurityQA	14748	DAG101	DAG101.SecurityQA2	SecurityQA2
DagSecurityQA	14748	DAG101	DAG101.SecurityQA1	SecurityQA1
DagBankTokenFMPA	15680	DAG101	DAG101.BankTokenFMPA2	BankTokenFMPA2
DagBankTokenFMPA	15680	DAG101	DAG101.BankTokenFMPA1	BankTokenFMPA1
DagMultilevel	15682	DAG101	DAG101.Multilevel1	Multilevel1
DagMultilevel	15682	DAG101	DAG101.Multileve12	Multileve12
DagTax	17260	DAG101	DAG101.Tax1	Tax1
DagTax	17260	DAG101	DAG101.Tax2	Tax2
DagCreditCardTokenPMPA	19976	DAG101	DAG101.CreditCardTokenPMPA2	CreditCardTokenPMPA2
DagCreditCardTokenPMPA	19976	DAG101	DAG101.CreditCardTokenPMPA1	CreditCardTokenPMPA1
 */
