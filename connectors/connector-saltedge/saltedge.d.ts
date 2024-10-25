declare namespace SaltEdge {
  // Inputs

  interface PaginationParams {
    per_page?: number
  }

  export interface CreateCustomerParams {
    identifier: string
  }

  export type ProviderMode = 'oauth' | 'web' | 'api' | 'file'

  export type JavascriptCallbackType =
    | 'iframe'
    | 'external_saltbridge'
    | 'external_notify'
    | 'post_message'

  export type CredentialsStrategy = 'store' | 'do_not_store' | 'ask'

  export type Theme = 'default' | 'dark'

  export interface CreateConnectSessionParams {
    customer_id: string
    consent: Consent
    attempt?: Attempt
    allowed_countries?: string[]
    provider_code?: string
    daily_refresh?: boolean
    disable_provider_search?: boolean
    return_connection_id?: boolean
    provider_modes?: ProviderMode[]
    categorization?: 'none' | 'personal' | 'business'
    javascript_callback_type?: JavascriptCallbackType
    include_fake_providers?: boolean
    lost_connection_notify?: boolean
    show_consent_confirmation?: boolean
    credentials_strategy?: CredentialsStrategy
    return_error_class?: boolean
    theme?: Theme
    connect_template?: string
  }

  /** https://docs.saltedge.com/account_information/v4/#tokens-reconnect */
  export interface ReconnectConnectionParams {
    connection_id: string
    consent: Consent
    attempt?: Attempt
    daily_refresh?: boolean
    return_connection_id?: boolean
    provider_modes?: ProviderMode[]
    javascript_callback_type?: JavascriptCallbackType
    include_fake_providers?: boolean
    categorization?: 'none' | 'personal' | 'business'
    lost_connection_notify?: boolean
    show_consent_confirmation?: boolean
    credentials_strategy?: CredentialsStrategy
    return_error_class?: boolean
    theme?: Theme
    connect_template?: string
    /** Possible values: ask, override.
     * If sent as ask, the user will be required to confirm the credentials
     * override upon submitting the form, in the scenario were the new
     * credentials are different from the ones in the previous attempt.
     * If sent as override, the new credentials will automatically override
     * the old ones. Default: null */
    override_credentials_strategy?: 'ask' | 'override'
  }

  export interface ListAccountsParams extends PaginationParams {
    connection_id: string
    customer_id?: string
    from_id?: string
  }

  export interface ListTransactionsParams extends PaginationParams {
    connection_id: string
    account_id?: string
    from_id?: string
  }

  export interface NotifyCallbackParams {
    data: {
      connection_id: string
      customer_id: string
      custom_fields: Record<string, unknown>
      stage:
        | 'start'
        | 'connect'
        | 'interactive'
        | 'fetch_holder_info'
        | 'fetch_accounts'
        | 'fetch_recent'
        | 'fetch_full'
        | 'disconnect'
        | 'finish'
    }
    meta: {
      version: string
      time: ISODateTime
    }
  }

  // Outputs

  interface ListResponse<T> {
    data: T[]
    meta: {
      next_id: string
      next_page: string
    }
  }

  export type ListCustomersResponse = ListResponse<Customer>

  export type ListConnectionsResponse = ListResponse<Connection>

  export type ListAccountsResponse = ListResponse<Account>

  export type ListTransactionsResponse = ListResponse<Transaction>

  // Models

  export interface Customer {
    id: string
    identifier: string
    secret: string
  }

  export interface ConnectSession {
    expires_at: ISODateTime
    connect_url: string
  }

  export interface Consent {
    scopes: Array<
      'account_details' | 'holder_information' | 'transactions_details'
    >
    from_date?: ISODate
    to_date?: ISODate
    period_days?: number
  }

  export interface Attempt {
    fetch_scopes?: Array<'accounts' | 'holder_info' | 'transactions'>
    from_date?: ISODate
    to_date?: ISODate
    fetched_accounts_notify?: boolean
    custom_fields?: Record<string, unknown>
    locale?:
      | 'bg'
      | 'cz'
      | 'de'
      | 'en'
      | 'es'
      | 'es-MX'
      | 'fr'
      | 'he'
      | 'hu'
      | 'it'
      | 'nl'
      | 'pl'
      | 'pt'
      | 'pt-BR'
      | 'ro'
      | 'ru'
      | 'sk'
      | 'tr'
      | 'uk'
      | 'zh-HongKong'
    include_natures?: string[]
    customer_last_logged_at?: ISODateTime
    exclude_accounts?: string[]
    store_credentials?: boolean
    user_present?: boolean
    return_to?: string
    interactive?: boolean
  }

  export interface Connection {
    id: string
    secret: string
    provider_id: string
    provider_code: string
    provider_name: string
    daily_refresh: boolean
    customer_id: string
    created_at: ISODateTime
    updated_at: ISODateTime
    last_success_at: ISODateTime
    status: 'active' | 'inactive' | 'disabled'
    country_code: string
    next_refresh_possible_at: ISODateTime | null
    store_credentials: boolean
    last_attempt: Attempt
    show_consent_confirmation: boolean
    last_consent_id: string
  }

  export interface Account {
    id: string
    name: string
    nature:
      | 'account'
      | 'bonus'
      | 'card'
      | 'checking'
      | 'credit'
      | 'credit_card'
      | 'debit_card'
      | 'ewallet'
      | 'insurance'
      | 'investment'
      | 'loan'
      | 'mortgage'
      | 'savings'
    balance: number
    currency_code: string
    extra: Record<string, unknown>
    connection_id: string
    created_at: ISODateTime
    updated_at: ISODateTime
  }

  export interface Transaction {
    id: string
    mode: 'normal' | 'fee' | 'transfer'
    status: 'posted' | 'loading'
    made_on: ISODate
    amount: number
    currency_code: string
    description: string
    category: string
    duplicated: boolean
    extra: {
      account_balance_snapshot?: number
      account_number?: string
      additional?: string
      asset_amount?: number
      asset_code?: string
      categorization_confidence?: number
      check_number?: string
      closing_balance?: number
      constant_code?: string
      convert?: boolean
      customer_category_code?: string
      customer_category_name?: string
      id?: string
      information?: string
      mcc?: string
      merchant_id?: string
      opening_balance?: number
      installment_debt_amount?: number
      original_amount?: number
      original_category?: string
      original_currency_code?: string
      original_subcategory?: string
      payee?: string
      payee_information?: string
      payer?: string
      payer_information?: string
      possible_duplicate?: boolean
      posting_date?: ISODate
      posting_time?: ISOTime
      record_number?: string
      specific_code?: string
      tags?: string[]
      time?: ISOTime
      transfer_account_name?: string
      type?: string
      unit_price?: number
      units?: number
      variable_code?: string
    }
    account_id: string
    created_at: ISODateTime
    updated_at: ISODateTime
  }

  export interface Categories {
    personal: {
      auto_and_transport: string[]
      bills_and_utilities: string[]
      business_services: string[]
      education: string[]
      entertainment: string[]
      fees_and_charges: string[]
      food_and_dining: string[]
      gifts_and_donations: string[]
      health_and_fitness: string[]
      home: string[]
      income: string[]
      insurance: string[]
      kids: string[]
      pets: string[]
      shopping: string[]
      transfer: string[]
      travel: string[]
      uncategorized: string[]
    }
    business: {
      cost_of_goods: string[]
      financials: string[]
      human_resources: string[]
      income: string[]
      insurance: string[]
      office: string[]
      services: string[]
      taxes: string[]
      transport: string[]
      utilities: string[]
      uncategorized: string[]
    }
  }
}
