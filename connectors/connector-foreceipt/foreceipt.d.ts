declare namespace Foreceipt {
  export interface Credentials {
    email: string
    password: string

    // MARK: - Cached values but related to credentails

    userJSON?: Record<string, unknown>
    /**
     * Contains accessToken `.token` and userGuid `.claims.foreceipt_user_id`
     */
    idTokenResult?: firebase.default.auth.IdTokenResult
    teamGuid?: string | null
  }

  export interface _ResourceOld {
    credentials: Credentials
    userGuid: string
    teamGuid: string | null
    user: TeamMember | null
    team: Team | null
    teamMembers: TeamMember[]
  }
  export interface IdTokenClaims {
    foreceipt_user_id: string
    foreceipt_check_time: string
    iss: string
    aud: string
    auth_time: number
    user_id: string
    sub: string
    iat: number
    exp: number
    email: string
    email_verified: boolean
    firebase: {
      identities: unknown[]
      sign_in_provider: string
    }
  }

  export interface Team {
    name: string
    last_update_time: string
    owner_user_id: string
    description: string
    create_by: string
    create_time: string
  }

  export interface TeamMember {
    is_owner?: boolean
    team_name: string
    user_guid: string
    user_id: string
    first_name: string
    last_name: string
    can_edit_all: boolean
    team_guid: string
    create_by?: string
    can_admin: boolean
    last_update_time: string
    can_view_all: boolean
    status?: string
    expirationdate?: string
    subscription?: string
    date_joined?: string
    autorenew?: string
  }

  export interface Receipt {
    user_guid: string
    content: {
      notes?: string
      bill?: boolean
      db_ver: string
      image_folder: string
      amount2?: number
      merchant?: string
      image_file_list: string[]
      sub_total?: number
      with_attachment?: boolean
      for_business?: boolean
      team_guid?: string
      currency: string
      scanned?: boolean
      user_guid?: string
      created_date?: string
      last_modified_date: string
      tags?: string
      id: string
      type:
        | 1 // Expense
        | 2 // Income
        | 3 // Transfer
      amount1?: number
      account_id: number
      category_id?: number
      returns?: boolean
      sub_category_id?: number
      source: number
      amount: number
      account1_id?: number
      return_days?: number
      receipt_date: string
      verified: boolean
      status: 'Deleted' | 'Normal'
      ref_receipt_id?: string
      category?: string
      account?: string
    }
    team_guid: string
    create_time: import('firebase/compat').default.firestore.Timestamp
    last_update_time: import('firebase/compat').default.firestore.Timestamp
  }

  export interface UserSetting {
    setting_type: 'ACCOUNT' | 'CATEGORY'
    setting_in_json: string
  }

  export type UserSettingJson = UserSettingAccount | UserSettingCategory

  export interface UserSettingAccount {
    db_ver: string
    default_account_id: number
    accounts: Account[]
  }

  export interface Account {
    id: number
    name: string
    order: number
    color: string
    type: 'Cash' | 'Credit Card' | 'Chequing' | 'Saving' | 'Loan' | 'Debit Card'
    symbol: number
    disabled: boolean
    status_reminder: boolean
    payment_reminder?: string
    currency?: string
  }

  export interface UserSettingCategory {
    db_ver: string
    default_expense_category_id: number
    default_expense_sub_category_id: string | null
    default_income_category_id: number
    default_income_sub_category_id: string | null
    categories: Category[]
  }

  export interface Category {
    id: number
    order: number
    name: string
    type: number
    disabled: boolean
    color: string
    sub_categories?: SubCategory[]
    notes?: string
  }

  export interface SubCategory {
    id: number
    order: number
    name: string
    disabled: boolean
  }
}
