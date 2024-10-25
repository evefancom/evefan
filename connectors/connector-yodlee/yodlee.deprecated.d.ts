/** @deprecated, please use yodlee.types */
declare namespace Yodlee {
  export type EnvName = 'sandbox' | 'development' | 'production'

  export type EventName = 'REFRESH' | 'DATA_UPDATES' | 'AUTO_REFRESH_UPDATES'

  export interface GetStatementParams {
    /** bank/creditCard/investment/insurance/loan	query	String */
    container?: Container
    /** Comma separated accountIds	query	String */
    accountId?: string
    /** from date for statement retrieval (YYYY-MM-DD) */
    fromDate?: string
    isLatest?: boolean
    status?: 'ACTIVE' | 'INACTIVE' | 'TO_BE_CLOSED' | 'CLOSED'
  }

  export interface GetTransactionParams {
    /** bank/creditCard/investment/insurance/loan	query	String */
    container?: Container
    /** DEBIT/CREDIT	query	String */
    baseType?: string
    /** Transaction search text	query	String */
    keyword?: string
    /** Comma separated accountIds	query	String */
    accountId?: string
    /** Transaction from date(YYYY-MM-DD)	query	String */
    fromDate?: string
    /** Transaction end date (YYYY-MM-DD)	query	String */
    toDate?: string
    /** Comma separated categoryIds	query	String */
    categoryId?: string
    /** Comma separated highLevelCategoryIds	query	String */
    highLevelCategoryId?: string
    /** Transaction Type(Supported containers: bank/card/investment)	query	String */
    type?: string
    /** Transaction Category Type(UNCATEGORIZE, INCOME, TRANSFER, EXPENSE or DEFERRED_COMPENSATION)	query	String */
    categoryType?: CategoryType
    /** UNRECONCILED(Default value),RECONCILED	query	String */
    accountReconType?: string
    /** skip (Min 0)	query	Integer */
    skip?: number
    /** top (Max 500)	query	Integer */
    top?: number
    /** Comma separated detailCategoryIds	query	String */
    detailCategoryId?: string
  }
  export interface GetHoldingsParams {
    // there are more here: https://developer.yodlee.com/api-reference#!/holdings/getHoldings
    /** Comma separated accountIds	query	String */
    accountId?: string | number
    providerAccountId?: string | number
    include?: 'assetClassification'
  }

  // I'm only adding the types we're interested in for now.
  // more can be found here: https://developer.yodlee.com/Yodlee_API/docs/v1_1/Data_Model/Resource_Transactions#Transaction_Type
  export type TransactionType = 'BUY' | 'SELL'
  export type TransactionSymbol = string
  export type TransactionQuantity = number
  // unions found on Yodlee API documentation
  export type TransactionBaseType = 'CREDIT' | 'DEBIT'
  export type TransactionCategorySource = 'SYSTEM' | 'USER'
  export type TransactionSourceType = 'YODLEE' | 'FACTUAL'
  export type TransactionStatus = 'POSTED' | 'PENDING' | 'SCHEDULED' | 'FAILED'
  export type AccountAggregationSource = 'SYSTEM' | 'USER'
  export type AccountClassification =
    | 'CORPORATE'
    | 'OTHER'
    | 'PERSONAL'
    | 'SMALL_BUSINESS'
    | 'TRUST'
    | 'VIRTUAL_CARD'
    | 'ADD_ON_CARD'
  export type AccountUserClassification = 'PERSONAL' | 'BUSINESS'
  export type AccountStatus = 'ACTIVE' | 'INACTIVE' | 'TO_BE_CLOSED' | 'CLOSED'

  /** Empirical list from https://production.api.yodlee.com/ysl/holdings/holdingTypeList */
  export type HoldingType =
    | 'CD'
    | 'ETF'
    | 'ETN'
    | 'bond'
    | 'commodity'
    | 'currency'
    | 'employeeStockOption'
    | 'future'
    | 'insuranceAnnuity'
    | 'moneyMarketFund'
    | 'mutualFund'
    | 'option'
    | 'balance_sheet/equity'
    | 'preferredStock'
    | 'remic'
    | 'stock'
    | 'unitInvestmentTrust'
    | 'unknown'
    | 'warrants'

  export interface User {
    id: number
    loginName: string
    roleType: string
    preferences: {
      /** 'USD' */ currency: string
      /** 'PST' */ timeZone: string
      /** 'MM/dd/yyyy' */ dateFormat: string
    }
    email: string
  }

  export interface Payload {
    iss: string /** The issuer id from the API Dashboard */
    iat: number /** Epoch time when token is issued in seconds */
    exp: number /** Epoch time when token is set to expire. Must be 900 seconds */
    sub?: string /** User token which is ledger ID. Not needed to register a user of course */
  }

  export interface Amount {
    amount: number
    currency: string
  }

  export interface TransactionDescription {
    /** Original transaction description as it appears at the FI site.	 */
    original: string
    /**
     * The description of the transaction as defined by the consumer. The consumer
     * can define or provide more details of the transaction in this field.
     */
    consumer: string
    /**
     * The transaction description that appears at the FI site may not be self-explanatory,
     * i.e., the source, purpose of the transaction may not be evident. Yodlee attempts
     * to simplify and make the transaction meaningful to the consumer, and this
     * simplified transaction description is provided in the simple description field.
     * Note: The simple description field is available only in the United States, Canada, United Kingdom, and India.
     */
    simple: string
  }

  export interface Merchant {
    categoryLabel: string[]
    id: number
    name: string
  }

  /**
   * Very complete description:
   * https://developer.yodlee.com/Yodlee_API/docs/v1_1/Data_Model/Resource_Transactions#Transaction_Status
   */
  export interface Transaction {
    accountId: number
    amount: Amount
    baseType: TransactionBaseType
    type?: TransactionType
    category: string
    categoryId: number
    categorySource: TransactionCategorySource
    categoryType: CategoryType
    CONTAINER: Container
    createdDate: string
    date: string
    description: TransactionDescription
    id: number
    isManual: boolean
    highLevelCategoryId: number
    lastUpdated: string
    merchant?: Merchant
    postDate: string
    quantity?: TransactionQuantity
    sourceType: TransactionSourceType
    price?: Price
    status: TransactionStatus
    symbol?: TransactionSymbol
    transactionDate: string
    isDeleted?: boolean
  }

  /**
   * Very complete description:
   * https://developer.yodlee.com/Yodlee_API/docs/v1_1/Data_Model/Resource_Account
   */
  export interface Account {
    accountName: string
    accountNumber?: string
    accountType: string
    accountStatus: AccountStatus
    aggregationSource: AccountAggregationSource
    amountDue: Amount
    annuityBalance: Amount
    availableBalance: Amount
    availableCash: Amount
    availableCredit: Amount
    balance: Amount
    cash: Amount
    classification: AccountClassification
    createdDate: string
    CONTAINER: Container
    currentBalance?: Amount
    dueDate: string
    displayedName: string
    expirationDate: string
    id: number
    includeInNetWorth: boolean
    isAsset: boolean
    isManual: boolean
    interestRate: number
    lastPayment: Amount
    lastPaymentAmount: Amount
    lastPaymentDate: string
    lastUpdated: string
    memo?: string
    minimumAmountDue: Amount
    nickname?: string
    providerAccountId: number
    providerId: string
    providerName: string
    remainingBalance: Amount
    totalCashLimit: Amount
    totalCreditLine: Amount
    userClassification: AccountUserClassification
    isDeleted?: boolean
  }

  /**
   * Very complete description:
   * https://developer.yodlee.com/Yodlee_API/docs/v1_1/Data_Model/Resource_Holdings
   */
  export interface CostBasis {
    amount: number
    currency: string
  }

  export interface Price {
    amount: number
    currency: string
  }

  export interface Value {
    amount: number
    currency: string
  }

  export interface AssetClassification {
    classificationType: string
    classificationValue: string
    allocation: number
  }

  export interface Holding {
    accountId: number
    assetClassification?: AssetClassification[]
    costBasis: CostBasis
    createdDate: string
    cusipNumber: string
    description: string
    enrichedDescription: string
    holdingType: HoldingType
    id: number
    isin: string
    lastUpdated: string
    matchStatus: string
    price?: Price
    providerAccountId: number
    quantity: number
    securityStyle: string
    securityType: string
    sedol: string
    symbol?: string
    value: Value
  }

  export interface HoldingSecurity {
    id: number
    security: Security
  }

  export type HoldingWithSecurity = Holding & Partial<HoldingSecurity>

  export interface Security {
    id: number
    cusip: string
    description: string
    type: string
    style: string
    issueTypeMultiplier: number
    agencyFactor: unknown
    shareClass: number
    cdscFundFlag: string
    fundFamily: string
    closedFlag: string
    sAndPRating: string
    moodyRating: string
    firmEligible: string
    issueDate: string
    maturityDate: string
    callDate: string
    callPrice: number
    sector: string
    subSector: string
    lastModifiedDate: string
    interestRate: number
    accrualMethod: number
    statTaxableCode: string
    federalTaxable: string
    tradeCurrency: string
    couponFrequency: number
    isin: string
    sedol: string
    firstCouponDate: string
    lastCouponDate: string
    minimumPurchase: number
    incomeCurrency: string
    isDummySecurity: string
    stockExchangeDetails: StockExchangeDetail[]
  }

  export interface StockExchangeDetail {
    symbol: string
    currencyCode: string
    countryCode: string
    exchangeCode: string
  }

  /** https://developer.yodlee.com/Yodlee_API/docs/v1_1/Data_Model/Resource_Provider_Accounts#Provider_Account_Status_Code */
  type ProviderAccountStatus =
    | 'LOGIN_IN_PROGRESS' // Login to provider site is in progress.
    | 'USER_INPUT_REQUIRED' // Additional authentication information is needed from the user.
    | 'IN_PROGRESS' // Login is successful and data aggregation is in progress.
    | 'PARTIAL_SUCCESS' // Data is partially retrieved.
    | 'SUCCESS' // Data is retrieved successfully.
    | 'FAILED' // Additional authentication information is needed from the user.

  /** Connection */
  export interface ProviderAccount {
    aggregationSource: string
    createdDate: string // Date
    dataset: Dataset[]
    id: number
    isManual: boolean
    providerId: number
    status: ProviderAccountStatus
    isDeleted?: boolean
  }

  export interface Dataset {
    lastUpdateAttempt: string // Date
    lastUpdated?: string // Date
    name: string
    nextUpdateScheduled: string // Date

    /** https://developer.yodlee.com/Yodlee_API/docs/v1_1/Data_Model/Resource_Account#Dataset_Additional_Statuses */
    additionalStatus:
      | 'LOGIN_IN_PROGRESS' //	Login to provider site is in progress	Not applicable as it is not a final status.
      | 'DATA_RETRIEVAL_IN_PROGRESS' //	Data aggregation is in progress. 	Not applicable as it is not a final status.
      | 'ACCT_SUMMARY_RECEIVED' //	Basic account data is retrieved. 	Not applicable as it is not a final status.
      | 'AVAILABLE_DATA_RETRIEVED' //	All the data available at the provider site is retrieved for the provided dataset.	Not applicable.
      | 'PARTIAL_DATA_RETRIEVED' //	Partial data is retrieved for the dataset.	Instruct the user to try again if the mandatory data is missing. If the request fails repeatedly, report the issue to the customer service team.
      | 'DATA_RETRIEVAL_FAILED' //	Failed to retrieve the data due to unexpected issues.	Instruct the user to try again later. If the request fails repeatedly, report the issue to the customer service team.
      | 'DATA_NOT_AVAILABLE' //	The requested data or document is not available at the provider site. 	Instruct the user to check with the respective data provider or provider site.
      | 'ACCOUNT_LOCKED' //	The account is locked at the provider site. The user has exceeded the maximum number of incorrect login attempts resulting in the account getting locked.	Instruct the user to visit the provider site and take necessary actions to unlock the account.
      | 'ADDL_AUTHENTICATION_REQUIRED' //	Additional MFA information is needed at the provider site or to download document additional verification is required.	Instruct the user to provide the required additional MFA information or verification.
      | 'BETA_SITE_DEV_IN_PROGRESS' //	The site for which the data is requested is in the development or beta stage. 	Instruct the user to try again later or disable the beta sites.
      | 'CREDENTIALS_UPDATE_NEEDED' //	Unable to log in to the provider site due to outdated credentials. The site may be prompting the user to change or verify the credentials.  	Instruct the user to visit the provider site and perform the required actions, and invoke the edit account flow to update the credentials in the Yodlee system.
      | 'INCORRECT_CREDENTIALS' //	Unable to log in to the provider site due to incorrect credentials. The credentials that the user has provided are incorrect.  	Instruct the user to provide the correct credentials by invoking the edit account flow.
      | 'PROPERTY_VALUE_NOT_AVAILABLE' //	The property value is not available.	Instruct the user to provide the property value.
      | 'INVALID_ADDL_INFO_PROVIDED' //	The user has provided incorrect MFA information or the MFA information provided has expired. 	Instruct the user to provide the correct MFA information.
      | 'REQUEST_TIME_OUT' //	The request has timed-out due to technical reasons.	Instruct the user to try again later. If the request fails repeatedly, report the issue to the customer service team.
      | 'SITE_BLOCKING_ERROR' //	The Yodlee IP is blocked by the provider site.	Instruct the user to try again later. If the request fails repeatedly, report the issue to the customer service team.
      | 'UNEXPECTED_SITE_ERROR' //	All error indicating issues at the provider site, such as the site is down for maintenance.	Instruct the user to try again later. If the request fails repeatedly, report the issue to the customer service team.
      | 'SITE_NOT_SUPPORTED' //	Indicates that the site does not support the requested data or support is not available to complete the requested action. For example, site not available, document download not supported at the site, etc.	Inform the user about the latest available status.
      | 'SITE_UNAVAILABLE' //	The provider site is unavailable due to issues such as the site is down for maintenance.	Instruct the user to try again later. If the request fails repeatedly, report the issue to the customer service team.
      | 'TECH_ERROR' //	Indicates there is a technical error. 	Instruct the user to try again later. If the request fails repeatedly, report the issue to the customer service team.
      | 'USER_ACTION_NEEDED_AT_SITE' //	The errors that require users to take action at the provider site, for example, accept T&C, etc.	Instruct the user to visit the provider site and perform the necessary action.
      | 'SITE_SESSION_INVALIDATED' //	Indicates if multiple sessions or a session is terminated by the provider site.	Instruct the user to try again later.
      | 'NEW_AUTHENTICATION_REQUIRED' //	The site has requested for OAuth authentication.	The OAUTH based authentication sites can be added or updated only using Yodlee FastLink and not Yodlee APIs. Instruct the user to add the account using FastLink.
      | 'DATASET_NOT_SUPPORTED' //	The requested datasets are not supported.	Either get the dataset/attribute enabled or remove the dataset/attribute from the input.
      | 'ENROLLMENT_REQUIRED_FOR_DATASET' //	The dataset cannot be retrieved as the user has not enrolled for it.	Instruct the user to enroll for the dataset and then request for it.

    /** https://developer.yodlee.com/Yodlee_API/docs/v1_1/Data_Model/Resource_Account#Update_Eligibility_Status */
    updateEligibility:
      | 'ALLOW_UPDATE' // This status indicates that the account is eligible for next update.
      | 'ALLOW_UPDATE_WITH_CREDENTIALS' // The status indicates to update or refresh the account by directing the user to edit the provided credentials.
      | 'DISALLOW_UPDATE' // The status indicates the account is not eligible for the update or refresh process due to a site issue or a technical error.
  }

  // TODO: add UNION for status and authType
  /** Institution */
  export interface Provider {
    id: number
    name: string
    loginUrl: string
    baseUrl: string
    favicon: string
    /** Should be a url already */
    logo: string
    status: string
    isAutoRefreshEnabled: boolean
    authType: string
    lastModified: string
    languageISOCode: string
    primaryLanguageISOCode: string
    countryISOCode: string
  }

  export interface HistoricalBalance {
    asOfDate: string
    balance: Amount
    dataSourceType: string
    date: string
    isAsset: boolean
  }

  /**
   * Only a few fields are defined here. For full reference, see
   * https://developer.yodlee.com/Yodlee_API/docs/v1_1/Data_Model/Resource_Statements
   */
  export interface Statement {
    accountId: number
    amountDue: Amount
    dueDate: string
    id: number
    isLatest: boolean
    lastUpdated: string
  }

  export type Event =
    | {
        data: {
          fromDate: string
          toDate: string
          userCount: number
          userData: Array<{
            links: Link[]
            user: {loginName: string}
          }>
        }
        info: 'DATA_UPDATES.USER_DATA'
      }
    | {
        /** Note: loginName is an optional field and is available only for REFRESH webhooks event */
        loginName?: string
        info: 'REFRESH.PROCESS_COMPLETED'
        data: unknown
      }
  // | {
  //     loginName?: string
  //     info: string
  //     data: unknown
  //   }

  export interface Link {
    href: string
    methodType: string
    rel: string
  }

  export interface UserData {
    user: {loginName: string}
    providerAccount?: Array<ProviderAccount & {isDeleted: boolean}>
    account?: Array<Account & {isDeleted: boolean}>
    transaction?: Array<Transaction & {isDeleted: boolean}>
    holding?: Array<Holding & {isDeleted: boolean}>
  }

  export interface SubscribedEvent {
    callbackUrl: string
    name: Yodlee.EventName
  }

  export interface Institution {
    PRIORITY: string
    id: number
    name: string
    loginUrl: string
    baseUrl: string
    favicon: string
    logo: string
    languageISOCode: string
    primaryLanguageISOCode: string
    lastModified: string
    isAddedByUser: boolean
    providerId: number[]
  }

  /**
   * https://developer.yodlee.com/Yodlee_API/docs/v1_1/Data_Model/Resource_Account
   * Enum: Aggregated Account Type
   */
  export type Container =
    | 'bank'
    | 'creditCard'
    | 'investment'
    | 'insurance'
    | 'loan'
    | 'otherAssets'
    | 'otherLiabilities'
    | 'realEstate'
    | 'reward'
    | 'bill'
    /** Not sure if these actually get returned separately or part of investment */
    | 'investment (SN 1.0)'
    | 'investment (SN 2.0)'

  /**
     * https://developer.yodlee.com/Yodlee_API/docs/v1_1/Data_Model/Resource_Transactions#Transaction_Category_Type
     * Transaction Category Type
categoryType	Description
TRANSFER	The transaction category belongs to a transfer category type.
DEFERRED_COMPENSATION	The transaction category belongs to deferred compensation type.
UNCATEGORIZE	The transaction does not seem to be categorized.
INCOME	The transaction category belongs to an income type.
EXPENSE	The transaction category belongs to an expense type.
     */
  export type CategoryType =
    | 'TRANSFER'
    | 'DEFERRED_COMPENSATION'
    | 'UNCATEGORIZE'
    | 'INCOME'
    | 'EXPENSE'
}
