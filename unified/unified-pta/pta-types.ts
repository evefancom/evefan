import type {Amount, AmountMap, Brand, Split} from '@openint/util'
import type {z} from '@openint/vdk'
import type {zAccountType, zResourceStatus, zReviewStatus} from './pta-utils'

// MARK: - Resource

export type ResourceStatus = z.infer<typeof zResourceStatus>
/**
 * Goes beyond the 5 top types so we can calculate standard metrics such as
 * EBITA, Gross Margins, etc.
 */
export type AccountType = z.infer<typeof zAccountType>
export type ReviewStatus = z.infer<typeof zReviewStatus>
export interface Resource {
  lastSuccessfulRefresh?: ISODateTime | null
  status: ResourceStatus
  name?: string | null
  notes?: string | null
  integration?: {
    name: string
    logoUrl?: string | null
    url?: string | null
  }
  /**
   * Whether we should hide the resource from user interface because
   * it's really an implementation detail. Only applies to Yodlee.User for now
   */
  hidden?: boolean
  removed?: boolean

  labelsMap?: LabelsMap | null
  attachmentsMap?: AttachmentsMap | null
}

// MARK: - Account

export type AccountSupertype = Split<AccountType, '/'>[0]
export type AccountSubtype =
  | NonNullable<Split<AccountType, '/'>[1]>
  | Brand<string, 'AccountSubtype'>

export type Icon = {emoji: string; url?: never} | {emoji?: never; url: string}

export interface Account<TBalance extends Balance = Balance> {
  id?: AccountId | null
  /** e.g. `Chase Checking` */
  name: string
  icon?: Icon | null
  type?: AccountType | null
  subtype?: AccountSubtype | null
  lastFour?: string | null
  /** Represent accounting account number */
  number?: string | null
  integrationName?: string | null
  /** ISO country code ideally, but really could be anything... */
  countryCode?: string | null
  openDate?: ISODate | null
  closeDate?: ISODate | null
  notes?: string | null
  defaultUnit?: Unit | null

  // Disabled till we can figure this out
  /** https://en.wikipedia.org/wiki/Cash_and_cash_equivalents#:~:text=Cash%20and%20cash%20equivalents%20(CCE,into%20a%20known%20cash%20amount%22. */
  // liquidity?: string | null

  informationalBalances?: {
    current?: Amount | null
    available?: Amount | null
    limit?: Amount | null
  } | null
  /** aka Balance History in the UI */
  balancesMap?: Record<ISODate | ISODateTime, TBalance | null> | null

  labelsMap?: LabelsMap | null
  attachmentsMap?: AttachmentsMap | null

  removed?: boolean
  custom?: Record<string, unknown>
  [k: string]: unknown
}

// MARK: - Transaction

export interface Transaction<TPosting extends Posting = Posting> {
  /** May not have prefix in practice... */
  id?: TransactionId | null
  // TODO: Move `date` to be optional fields on postings rather
  // than on transactions
  // TODO: Evaluate using different dates for `is` posting vs `bs` posting
  // as a easy way to do accrual accounting? (think house utilities)
  // TODO: Fix typing here to be optional date, which is the case while entering data
  // We need to think more broadly about enforcing all standard transactions are
  // valid as long as they are type safe vs handling cases where all fields are optional
  // when we are initially entering data...
  date: ISODateTime | ISODate

  /** Would default to 'unreviewed' by default */
  reviewStatus?: ReviewStatus
  /**
   * Aka Merchant | Customer | Vendor
   * In particular this is a field we can depend on to render custom icons for each transaction (e.g. Walmart icon)
   */
  payee?: string | null
  /**
   * Should be exactly as it appears on user's bank statement.
   * payee | merchant | name https://hledger.org/journal.html#payee-and-note
   * Should this be renamed to `narration`?
   */
  description: string

  notes?: string | null
  /**
   * Category from provider / bank. Informational but can be used in rules to actually
   * categorize transactions into the user's own chart of accounts
   */
  externalCategory?: string | null
  /** Status from provider / bank */
  externalStatus?: 'pending' | 'cancelled' | Brand<string, 'externalStatus'>
  postingsMap?: PostingsMap<TPosting> | null
  /** https://support.plaid.com/hc/en-us/articles/360008271814-Pending-transaction-overview */
  pendingTransactionExternalId?: ExternalId | null

  labelsMap?: LabelsMap | null
  attachmentsMap?: AttachmentsMap | null

  /** For custom attributes. Use me instead of labelsMap */
  custom?: Record<string, unknown>

  /**
   * Used for linking / grouping multiple transactions that are part of the same transfer together
   */
  transferId?: string

  // TODO: This is no longer needed as we have a better way of handling
  // pending transactions now...
  removed?: boolean

  [k: string]: unknown
}

// MARK: - Commodity

/** For inspiration, see Plaid.SecurityType */
export type CommodityType =
  | 'currency'
  | 'stock'
  | 'crypto'
  | 'other'
  | 'item_request'
  | 'item_payment'
  // real_estate, etc.
  | Brand<string, 'CommodityType'>

export interface Commodity<TPrice = Price> {
  id?: CommodityId | null
  /** symbol. `USD` */
  unit: Unit
  /** `US Dollar` */
  name?: string | null
  icon?: Icon | null
  type?: CommodityType | null
  description?: string | null
  exponent?: number | null
  /** Assuming closing price of the day */
  pricesMap?: Record<
    string /* Id.prce (prce_${quoteUnit}_${date}) */,
    // SetOptional<TPrice, 'baseUnit' | 'price'> // Not working
    Omit<TPrice, 'baseUnit' | 'date'> & {date?: ISODateTime; baseUnit?: Unit}
  >

  labelsMap?: LabelsMap | null
  attachmentsMap?: AttachmentsMap | null

  [k: string]: unknown
}

// MARK: - Embedded entities

// MARK: - Posting

export interface SpecialPostingsMap<TPosting extends Posting | null = Posting> {
  main?: TPosting | null
  // Should remove me. No more special remainder posting...
  remainder?: Omit<NonNullable<TPosting>, 'amount'> | null
}

export type PostingsMap<TPosting extends Posting | null = Posting> = Record<
  string,
  TPosting
> &
  SpecialPostingsMap<TPosting>

export type Frequency = 'days' | 'weeks' | 'months' | 'quarters' | 'years'

/** Posting accrual settings */
export type PostingAccrual =
  | {date: ISODateTime | ISODate}
  | {
      frequency: Frequency
      interval: ISOInterval
    }

export type PostingType = 'main' | 'fee' | 'trading' | 'category'

export interface Posting<
  TCustom extends Record<string, unknown> | undefined =
    | Record<string, unknown>
    | undefined,
> {
  /**
   * Potentially @deprecated.
   * TODO: We still need to decide whether accrual is a runtime transformation
   * or raw operation that modifies te actual list of postings
   * Notably raw operation may make the categoryPosting a bit more challenging
   * to work with. But runtime transformation presents UX problems that we don't
   * currently have solutions for
   */
  date?: ISODateTime | ISODate | null
  /** @deprecated. Should be some kind of metadata to handle accrual like this */
  accrual?: PostingAccrual | null
  amount: Amount

  memo?: string | null

  /** Allow overriding transaction.payee */
  payee?: string | null

  /**
   * Override the automatic determination based on keys
   * @warning Perhaps this should only be determined at run time and not
   * explicitly provided?
   */
  type?: PostingType

  /**
   * Used to render positing in a predictable order
   * Mixed string + number sort key has weird behaviors in JS. recommend only using 1
   */
  sortKey?: number

  // This should technically be called `acountId` however
  // that would conflict with Raw.Posting, oh well...
  /** Not sure to me whether we really should be using this, but oh well. */
  accountId?: AccountId | null
  // TODO: Should we turn these into an actual
  // `Account` field?
  /** Maps to accountId?: AccountId */
  accountExternalId?: ExternalId | null
  /** Chase Checking */
  accountName?: string | null
  accountType?: AccountType | null

  /** Dynamic subaccount support */
  subAccountKey?: string

  // Should we actually support both total and unit cost? Is that worth
  // the complexity?

  /**
   * See https://share.getcloudapp.com/ApukLmdx
   * Mainly useful for lot-tracking and holding information.
   * Would be inferred unless otherwise explicitly stated.
   * */
  cost?: Cost | null

  /**
   * Comment out as price ought to be inferred. However, which specific
   * posting would have inferred price? Now that's the question
   *
   * Cost * Price = Amount
   * 100 USD * 14,433.50 IDR/USD = 1,443,350 IDR
   */
  price?: {amount: Amount; type: 'unit' | 'total'} | null

  /** @deprecated. Do not use. Only txn have labels map now */
  labelsMap?: LabelsMap | null
  /** @deprecated. Do not use. Only txn have attachments now */
  attachmentsMap?: AttachmentsMap | null

  /** For custom attributes. Use me instead of labelsMap */
  custom?: TCustom
}

export interface Cost {
  amount: Amount
  type: 'unit' | 'total'
  date?: ISODate
  label?: string
}

// MARK: - Balance

/**
 * Holding is really nothing but a posting and we may not actually need it at all
 * See https://docs.google.com/document/d/1qPdNXaz5zuDQ8M9uoZFyyFis7hA0G55BEfhWhrVBsfc/edit#heading=h.n5ispaok8sog
 * However many data vendors end up giving this and until we have a better way
 * of representing it we'll keep it in the standard core. Though we should
 * make this field not directly editable by the user, and only used at runtime
 * by the providers
 */
export interface Holding extends Amount {
  /** Per unit, not total. Informational, not used in accounting equation */
  costBasis?: Amount | null
  /** Per unit, not total. Informational, not used in accounting equation */
  lastQuote?: Amount | null
  lastQuoteDate?: ISODate | null
}

export interface Balance {
  // This will be added for future
  id?: string
  /** Optional key can sometimes be used as `date` */
  date?: ISODateTime
  disabled?: boolean
  // TODO: Should be able to change the paddingAccount
  /**
   * Should this be `holdings` instead?
   * Needs to be an array of Amount because otherwise
   * we cannot use it easily with firebase .set(merge: true)
   */
  holdings: Holding[]
  /** Will be description of the generated transaction */
  description?: string | null
  /**
   * Normally would only generate a transaction if balance does not
   * match transaction history. If this flag is true then transaction will
   * be unconditionally generated even if the amount is 0.
   */
  alwaysGenerateTransaction?: boolean
  /** if true, we may move the first balance to beginning of txn history */
  autoShiftPaddingDate?: boolean
  /**
   * Whether to assert balance in a single commodity or multiple
   * commodities.
   * See https://beancount.github.io/docs/balance_assertions_in_beancount.html#partial-vs.-complete-assertions
   */
  variant?: 'partial' | 'complete' | null

  labelsMap?: LabelsMap | null
  attachmentsMap?: AttachmentsMap | null
  custom?: Record<string, unknown> & {
    /**
     * Used by beancount converter to determine whether to generate padding.
     * Not currently used by Alka. Will need padding account for it to be correct though
     */
    paddingAmount?: AmountMap
  }
}

// MARK: - Price

/**
 * USD:CAD = 1.32
 * [base]:[target] = [rate]
 * TODO: Add labels and attachments to the mix.
 */
export interface Price {
  /** symbol. `USD` */
  baseUnit: Unit
  date: ISODate
  /** 1.32 CAD */
  quote: Amount
  description?: string | null
  // /** symbol. `CAD` */
  // targetUnit: Unit
  // /** `1.32` */
  // rate: number
  id?: string
  attachmentsMap?: AttachmentsMap | null
  labelsMap?: LabelsMap | null
  custom?: Record<string, unknown>
}

// MARK: - Other types

export interface Note {
  content: string
  date?: ISODateTime | null
}

export type LabelsMap = Record<string /* name */, boolean | string>

export interface Attachment {
  url: string

  // Enrichment data
  _enriched?: boolean

  downloadUrl?: string | null
  previewUrl?: string | null
  previewSize?: [width: number, height: number] | null
  mimetype?: string | null
  filename?: string | null
  /** File size in bytes */
  fileSize?: number | null
  title?: string | null

  /** @deprecated */
  contentType?: string | null
}

export type AttachmentsMap = Record<string /* url */, Attachment | null>

// MARK: - JSONExport

export interface JSONExport {
  variant: 'standard'
  version: '1'
  ledger?: {
    defaultUnit?: Unit | null
  }
  entities: TypeAndEntity[]
  // account: Record<ExternalId, Standard.Account>
  // transaction: Record<ExternalId, Standard.Transaction>
  // commodity: Record<ExternalId, Standard.Commodity>
}

export type TypeAndEntity =
  | readonly ['account', Account]
  | readonly ['transaction', Transaction]
  | readonly ['commodity', Commodity]
// | readonly ['balance', Balance]
// | readonly ['price', Price]
// TODO: Should `balance` and `price` actually exist here?
