import {z} from '@openint/vdk'

export const transaction = z
  .object({
    id: z.string(),
    date: z.string(), // .datetime(),
    description: z.string().nullish(),
    category_id: z.string().nullish(),
    category_name: z.string().nullish(),
    amount: z.number(),
    currency: z.string(),
    merchant_id: z.string().nullish(),
    merchant_name: z.string().nullish(),
    account_id: z.string().nullish(),
    account_name: z.string().nullish(),
  })
  .openapi({ref: 'banking.transaction'})

export const account = z
  .object({
    id: z.string(),
    name: z.string(),
    current_balance: z.number().optional(),
    currency: z.string().optional(),
  })
  .openapi({ref: 'banking.account'})

export const merchant = z
  .object({
    id: z.string(),
    name: z.string(),
    url: z.string().nullish(),
  })
  .openapi({ref: 'banking.merchant'})

export const category = z
  .object({
    id: z.string(),
    name: z.string(),
  })
  .openapi({ref: 'banking.category'})
