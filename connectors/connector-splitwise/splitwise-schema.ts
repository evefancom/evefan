import {z} from '@openint/util'

const zImage = z.object({
  original: z.string().nullish(),
  xxlarge: z.string().nullish(),
  xlarge: z.string().nullish(),
  large: z.string().nullish(),
  medium: z.string().nullish(),
  small: z.string().nullish(),
})

export const zUser = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string().nullish(),
  picture: zImage,
})

export const zCurrentUser = z.object({
  country_code: z.string(),
  custom_picture: z.boolean(),
  date_format: z.string(),
  default_currency: z.string(),
  default_group_id: z.number(),
  email: z.string(),
  first_name: z.string(),
  force_refresh_at: z.string(),
  id: z.number(),
  last_name: z.string(),
  locale: z.string(),
  notifications: z.object({
    added_as_friend: z.boolean(),
    added_to_group: z.boolean(),
    announcements: z.boolean(),
    bills: z.boolean(),
    expense_added: z.boolean(),
    expense_updated: z.boolean(),
    monthly_summary: z.boolean(),
    payments: z.boolean(),
  }),
  notifications_count: z.number(),
  notifications_read: z.string(),
  picture: zImage,
  registration_status: z.string(),
})

export const zDebt = z.object({
  to: z.number(),
  from: z.number(),
  amount: z.string(),
  currency_code: z.string(),
})
export const zGroup = z.object({
  id: z.number(),
  name: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  members: z.array(
    z.object({
      id: z.number(),
      first_name: z.string(),
      last_name: z.string(),
      picture: zImage,
      custom_picture: z.boolean(),
      email: z.string(),
      registration_status: z.string(),
      balance: z.array(
        z.object({
          currency_code: z.string(),
          amount: z.string(),
        }),
      ),
    }),
  ),
  simplify_by_default: z.boolean(),
  original_debts: z.array(zDebt),
  simplified_debts: z.array(zDebt),
  avatar: zImage,
  custom_avatar: z.boolean(),
  cover_photo: zImage,
  whiteboard: z.unknown(),
  group_type: z.string().nullish(),
  invite_link: z.string().nullish(),
})

export const zExpensesParams = z.object({
  group_id: z.union([z.string(), z.number()]).nullish(),
  friend_id: z.union([z.string(), z.number()]).nullish(),
  dated_after: z.string().nullish(),
  dated_before: z.string().nullish(),
  updated_after: z.string().nullish(),
  updated_before: z.string().nullish(),
  limit: z.union([z.string(), z.number()]).nullish(),
  offset: z.union([z.string(), z.number()]).nullish(),
})

export const zExpense = z.object({
  id: z.number(),
  group_id: z.number().nullish(),
  friendship_id: z.unknown(),
  expense_bundle_id: z.unknown(),
  description: z.string(),
  repeats: z.boolean(),
  repeat_interval: z.string().nullish(),
  email_reminder: z.boolean(),
  email_reminder_in_advance: z.number(),
  next_repeat: z.string().nullish(),
  details: z.string().nullish(),
  comments_count: z.number(),
  payment: z.boolean(),
  creation_method: z.string().nullish(),
  transaction_method: z.string(),
  transaction_confirmed: z.boolean(),
  transaction_id: z.unknown(),
  cost: z.string(),
  currency_code: z.string(),
  repayments: z.array(
    z.object({
      from: z.number(),
      to: z.number(),
      amount: z.string(),
    }),
  ),
  /** 2012-05-02T13:00:00Z */
  date: z.string(),
  created_at: z.string(),
  created_by: z.object({
    id: z.number(),
    first_name: z.string(),
    last_name: z.string().nullish(),
    picture: zImage,
    custom_picture: z.boolean(),
  }),
  updated_at: z.string(),
  updated_by: z
    .object({
      id: z.number(),
      first_name: z.string(),
      last_name: z.string().nullish(),
      picture: zImage,
      custom_picture: z.boolean(),
    })
    .nullish(),
  deleted_at: z.unknown(),
  deleted_by: z.unknown(),
  category: z.object({
    id: z.number(),
    name: z.string(),
  }),
  receipt: zImage,
  users: z.array(
    z.object({
      user: zUser,
      user_id: z.number(),
      paid_share: z.string(),
      owed_share: z.string(),
      net_balance: z.string(),
    }),
  ),
})
