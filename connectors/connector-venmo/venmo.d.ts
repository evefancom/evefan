/* eslint-disable @typescript-eslint/no-explicit-any */

declare namespace Venmo {
  export interface Credentials {
    cookie?: string
    accessToken?: string
  }

  export interface GetResponse<T = any> {
    data: T
  }

  export interface OauthAccessTokenResponse {
    access_token: string
    balance: number
    user: {
      display_name: string
      email: string
      first_name: string
      id: string
      last_name: string
      phone: string
      profile_picture_url: string
      username: string
    }
  }

  export interface GetCurrentUserData {
    automatic_transfer_enabled: boolean
    /** bank | card */
    available_instant_transfer_capabilities: string[]
    balance: string
    cip_status: string
    is_balance_upgrade_user: boolean
    is_indebted: boolean
    is_limited_account: boolean
    is_suspended_for_disputes: boolean
    needs_verification: string
    notifications: {
      incoming_count: number
      outgoing_count: {
        outgoing_payments_count: number
        outgoing_requests_count: number
      }
    }
    testing_bucket_id: string
    use_new_default_funding_source_logic: boolean
    user: User
    zendesk_identifier: string
  }

  export interface User {
    about: string
    /** e.g. "2010-04-13T17:42:54" */
    date_joined: string
    display_name: string
    email: string
    first_name: string
    friend_status: any
    friends_count: number
    /* corresponds to long form id, i.e. LoggedInUser.external_id */
    id: string
    identity: {has_submitted: boolean} | null
    is_active: boolean
    is_blocked: boolean
    is_group: boolean
    is_venmo_team?: boolean
    last_name: string
    phone: string
    profile_picture_url: string
    trust_request: any
    username: string
  }

  export interface GetTransactionHistoryData {
    start_balance: number
    year_to_date_fees: number
    end_balance: number
    statement_period_fees: number
    transactions: Transaction[]
  }

  export interface Transaction {
    refund: any
    capture?: Capture
    direct_deposit: any
    disbursement: any
    internal_balance_transfer: any
    transfer?: Transfer
    datetime_created: string
    payment?: Payment
    note?: string
    top_up: any
    amount: number
    direct_deposit_reversal: any
    funding_source?: FundingSource
    type: string
    id: string
    authorization: any
    dispute: any
  }

  export interface Capture {
    payment_id: string
    amount_cents: number
    authorization_id: string
    datetime_created: string
    top_up: any
    id: string
    authorization: Authorization
  }

  export interface Authorization {
    status: string
    merchant: Merchant
    authorization_types: any[]
    rewards: any
    is_venmo_card: boolean
    decline: any
    payment_method: PaymentMethod
    story_id: string
    created_at: string
    acknowledged: boolean
    atm_fees: any
    rewards_earned: boolean
    descriptor: string
    amount: number
    user: User
    captures: any[]
    id: string
    point_of_sale: {
      city: any
      state: any
    }
  }

  export interface Merchant {
    braintree_merchant_id: string
    datetime_updated: string
    display_name: string
    image_datetime_updated: string
    image_url: string
    paypal_merchant_id: string
    id: string
    datetime_created: string
  }

  export interface PaymentMethod {
    top_up_role: string
    default_transfer_destination: string
    fee: any
    last_four: any
    id: string
    card: any
    assets: any
    peer_payment_role: string
    name: string
    image_url: any
    bank_account: any
    merchant_payment_role: string
    type: string
  }

  export interface Transfer {
    /** Empirically. Other status possible? */
    status:
      | 'loading'
      | 'issued' // Standard transfers
      | 'complete' // Instant Transfer
      | 'cancelled' // Cancelled transfers
    amount: number
    date_requested: string
    amount_cents: number
    amount_fee_cents: number
    destination: Destination
    amount_requested_cents: number
    type: 'standard' | 'instant'
  }

  export interface Destination {
    transfer_to_estimate: string
    is_default: boolean
    last_four: string
    account_status: string
    id: string
    bank_account: any
    assets: Assets
    asset_name: string
    name: string
    image_url: {
      detail: string
      thumbnail: string
    }
    card: any
    type: string
  }

  export interface Assets {
    detail: string
    thumbnail: string
  }

  export interface Payment {
    status: 'settled' | 'loading' | 'held'
    id: string
    date_authorized: any
    date_completed: string
    target: {
      merchant: any
      redeemable_target: any
      phone: any
      user: User
      email: string | null
      /** Can probably also be merchant */
      type: 'user' | string
    }
    audience: string
    actor: {
      username: string
      last_name: string
      friends_count: any
      is_group: boolean
      is_active: boolean
      trust_request: any
      phone: any
      profile_picture_url: string
      is_blocked: boolean
      id: string
      identity: any
      date_joined: string
      about: string
      display_name: string
      first_name: string
      friend_status: string
      email: any
    }
    note: string
    amount: number
    action: 'charge' | 'pay'
    date_created: string
    date_reminded: any
  }

  export interface FundingSource {
    top_up_role: string
    default_transfer_destination: string
    fee: any
    last_four?: string
    id: string
    card: any
    assets?: Assets
    peer_payment_role: string
    name: string
    image_url?: string
    bank_account?: BankAccount
    merchant_payment_role: string
    /** Anything else? */
    type: 'balance' | 'bank' | 'card'
  }

  export interface BankAccount {
    is_verified: boolean
    id: string
    bank: {
      asset_name: string
      name: string
    }
  }

  export interface GetStoryResponse {
    pagination: {
      previous: string | null
      next: string | null
    }
    data: Story[]
  }

  export interface Story {
    date_updated: string
    transfer?: Transfer
    app?: App
    comments: {
      count: number
      data: Comment[]
    }
    payment?: Payment
    note?: string
    audience: string
    likes: {
      count: number
      data: Like[]
    }
    mentions: {
      count: number
      data: Mention[]
    }
    /** 2019-12-14T01:50:19 */
    date_created: string
    /**
     * Todo: What else?
     * `transfer` and `cashout` are the same thing in practice, tho type of `cashout`
     * fails to capture the amount
     */
    type: 'payment' | 'cashout' | 'transfer'
    id: string
    authorization: any
  }

  export interface App {
    description: string
    site_url: any
    image_url: string
    id: number
    name: string
  }

  export interface Comment {
    date_created: string
    message: string
    mentions: {
      count: number
      data: Mention[]
    }
    id: string
    user: User
  }

  export interface Mention {
    /** Has an extra `@` relative `user.username` to e.g. `@Jackie_Morrill` */
    username: string
    user: User
  }

  export interface Like {
    username: string
    last_name: string
    friends_count: any
    is_group: boolean
    is_active: boolean
    trust_request: any
    phone: any
    profile_picture_url: string
    is_blocked: boolean
    id: string
    identity: any
    date_joined: string
    about: string
    display_name: string
    first_name: string
    friend_status: string
    email: any
  }

  // Variables encoded in Venmo HTML
  // https://share.getcloudapp.com/rRuL8ZO5

  export interface LoggedInUser {
    last_name: string
    lookup_balance_float: number
    full_name: string
    watchlisted: boolean
    suspended: boolean
    profile_picture_medium: string
    id: number
    first_name: string
    user_id: number
    profile_picture_large: string
    facebook_id: number
    email: string
    phone_is_verified: boolean
    username: string
    is_group: boolean
    about: string
    phone: string
    profile_picture: string
    share_publicly: number
    business_name: any
    is_business: boolean
    blacklisted: any
    best_full_name: string
    external_id: number
    date_created: string
    SUPER: string
    f_balance: string
  }

  export interface LoggedInUserApiFormat {
    username: string
    picture: string
    is_business: boolean
    name: string
    firstname: string
    lastname: string
    cancelled: boolean
    date_created: string
    external_id: string
    id: string
  }

  export interface PayOrChargeReponse {
    data: {
      balance: string
      payment: Payment
      /** 'venmo1://paycharge?signed_request=...' */
      redirect_url: string
    }
  }

  export interface Device {
    browser: string
    created_at: string
    current_device: boolean
    fingerprint: string
    id: number
    location: string
    name: string
    platform: string
    user_agent: string
  }
}
