declare namespace Moota {
  export interface ClientConfig {
    token: string
  }

  export interface Webhook {
    id: number
    bank_id: string
    account_number: number
    bank_type: string
    date: string
    amount: string
    description: string
    type: string
    balance: number
  }

  export interface AccountProfile {
    name: string
    email: string
    address: unknown
    city: unknown
    join_at: string
  }

  export interface Pagination<T> {
    current_page: number
    data: T[]
    first_page_url: string
    from: number
    last_page: number
    last_page_url: string
    next_page_url: unknown
    path: string
    per_page: number
    prev_page_url: unknown
    to: number
    total: number
  }

  export interface BankAccount {
    corporate_id: unknown
    username: string
    atas_nama: string
    balance: string
    account_number: string
    bank_type: string
    login_retry: number
    date_from: string
    date_to: string
    interval_refresh: number
    is_active: boolean
    in_queue: number
    in_progress: number
    is_crawling: number
    recurred_at: string
    created_at: string
    token: string
    bank_id: string
    label: string
    last_update: string
    icon: string
    meta?: {activity_summary?: string}
    next_queue: unknown
    pkg: unknown
  }
  export interface Transaction {
    account_number: string
    /** Format: 2021-07-28 13:41:00. WIB zone by default */
    date: string
    description: string
    amount: string
    type: string
    note: string
    balance: string
    created_at: string
    updated_at: string
    mutation_id: string
    token: string
    bank_id: string
    bank: BankAccount
    taggings: Tagging[]
  }

  export interface Tagging {
    tag_id: string
    name: string
  }

  export interface ListTransactionsParams {
    bank_id: string
    page?: number
  }

  export type ListTransactionsResponse = Pagination<Transaction>

  export interface ListBankAccountsParams {
    page?: number
  }

  export type ListBankAccountsResponse = Pagination<BankAccount>
}
