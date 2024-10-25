// TODO: See if we can leverage types from plaid SDK to make this more comprehensive...

type Webhook<Type, Code, Props extends Record<string, unknown>> = {
  webhook_type: Type
  webhook_code: Code
  item_id: string
} & Props

/**
 * https://plaid.com/docs/#transactions-webhooks
 * Only includes Transaction and Item webhooks
 */
export type WebhookShape =
  | ItemWebhook
  | TransactionsWebhook
  | Webhook<
      'HOLDINGS',
      'DEFAULT_UPDATE',
      {error: unknown; new_holdings: number; updated_holdings: number}
    >
  | Webhook<
      'INVESTMENTS_TRANSACTIONS',
      'DEFAULT_UPDATE',
      {
        error: unknown
        new_investments_transactions: number
        cancelled_investments_transactions: number
      }
    >
  // Not implemented by ledgersync today.
  | Webhook<'ASSETS', string, {}>
  | Webhook<'AUTH', string, {}>
  | Webhook<'INCOME', string, {}>
  | Webhook<'PAYMENT_INITIATION', string, {}>

export type ItemWebhook =
  /** Fired when an Item’s webhook is updated. */
  | Webhook<'ITEM', 'WEBHOOK_UPDATE_ACKNOWLEDGED', {new_webhook_url: string}>
  /**
   * Fired when an error is encountered with an Item. The error can be resolved
   * by having the user go through Link’s update mode
   */
  | Webhook<
      'ITEM',
      'ERROR',
      {error: Extract<ErrorShape, {error_type: 'ITEM_ERROR'}>}
    >

export type TransactionsWebhook =
  /**
   * Fired when an Item's initial transaction pull is completed.
   * Note: The default pull is 30 days.
   */
  | Webhook<'TRANSACTIONS', 'INITIAL_UPDATE', {new_transactions: string}>
  /**
   * Fired when an Item's historical transaction pull is completed.
   * Plaid fetches as much data as is available from the financial institution.
   */
  | Webhook<'TRANSACTIONS', 'HISTORICAL_UPDATE', {new_transactions: string}>
  /**
   * Fired when new transaction data is available as Plaid performs
   * its regular updates of the Item.
   */
  | Webhook<'TRANSACTIONS', 'DEFAULT_UPDATE', {new_transactions: string}>
  /**
   * Fired when posted transaction(s) for an Item are deleted. The deleted
   * transaction IDs are included in the webhook payload.
   */
  | Webhook<
      'TRANSACTIONS',
      'TRANSACTIONS_REMOVED',
      {removed_transactions: string[]}
    >

/** plaid.com/docs/#errors-overview */
export type ErrorShape = ErrorTypeAndCode & {
  /**
   * A developer-friendly representation of the error code.
   * This may change over time and is not safe for programmatic use.
   */
  error_message: string
  /**
   * A user-friendly representation of the error code. null if the error is not related to user action.
   * This may change over time and is not safe for programmatic use.
   */
  display_message?: string
  /** Applies to most errors */
  request_id?: string
}

export type ErrorTypeAndCode =
  | {
      error_type: 'INVALID_REQUEST'
      error_code:
        | 'MISSING_FIELDS'
        | 'UNKNOWN_FIELDS'
        | 'INVALID_FIELD'
        | 'INVALID_BODY'
        | 'INVALID_HEADERS'
        | 'NOT_FOUND'
        | 'SANDBOX_ONLY'
    }
  | {
      error_type: 'INVALID_INPUT'
      error_code:
        | 'INVALID_API_KEYS'
        | 'UNAUTHORIZED_ENVIRONMENT'
        | 'INVALID_ACCESS_TOKEN'
        | 'INVALID_PUBLIC_TOKEN'
        | 'INVALID_PRODUCT'
        | 'INVALID_ACCOUNT_ID'
        | 'INVALID_INSTITUTION'
    }
  | {
      error_type: 'INSTITUTION_ERROR'
      error_code:
        | 'INSTITUTION_DOWN'
        | 'INSTITUTION_NOT_RESPONDING'
        | 'INSTITUTION_NOT_AVAILABLE'
        | 'INSTITUTION_NO_LONGER_SUPPORTED'
    }
  | {
      error_type: 'RATE_LIMIT_EXCEEDED'
      error_code:
        | 'ACCOUNTS_LIMIT'
        | 'ADDITION_LIMIT'
        | 'AUTH_LIMIT'
        | 'TRANSACTIONS_LIMIT'
        | 'IDENTITY_LIMIT'
        | 'INCOME_LIMIT'
        | 'ITEM_GET_LIMIT'
        | 'RATE_LIMIT'
    }
  | {
      error_type: 'API_ERROR'
      error_code: 'INTERNAL_SERVER_ERROR' | 'PLANNED_MAINTENANCE'
    }
  | {
      error_type: 'AUTH_ERROR'
      error_code: 'PRODUCT_NOT_READY' | 'VERIFICATION_EXPIRED'
    }
  | {
      error_type: 'ITEM_ERROR'
      error_code:
        | 'INVALID_CREDENTIALS'
        | 'INVALID_MFA'
        | 'INVALID_UPDATED_USERNAME'
        | 'ITEM_LOCKED'
        | 'ITEM_LOGIN_REQUIRED'
        | 'ITEM_NO_ERROR'
        | 'ITEM_NOT_SUPPORTED'
        | 'ITEM_NO_VERIFICATION'
        | 'INCORRECT_DEPOSIT_AMOUNTS'
        | 'TOO_MANY_VERIFICATION_ATTEMPTS'
        | 'USER_SETUP_REQUIRED'
        | 'MFA_NOT_SUPPORTED'
        | 'NO_ACCOUNTS'
        | 'NO_AUTH_ACCOUNTS'
        | 'PRODUCT_NOT_READY'
        | 'PRODUCTS_NOT_SUPPORTED'
    }
  | {
      error_type: 'ASSET_REPORT_ERROR'
      error_code:
        | 'PRODUCT_NOT_ENABLED'
        | 'DATA_UNAVAILABLE'
        | 'PRODUCT_NOT_READY'
        | 'ASSET_REPORT_GENERATION_FAILED'
        | 'INVALID_PARENT'
        | 'INSIGHTS_NOT_ENABLED'
        | 'INSIGHTS_PREVIOUSLY_NOT_ENABLED'
    }
