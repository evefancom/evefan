import {z} from '@openint/vdk'

export const address = z
  .object({
    city: z.string(),
    country: z.string(),
    postal_code: z.string(),
    state: z.string(),
    street_1: z.string(),
    street_2: z.string(),
  })
  .openapi({ref: 'sales-engagement.address'})

export const email_address = z
  .object({
    email_address: z.string(),
    email_address_type: z.enum(['primary', 'personal', 'work', 'other']),
  })
  .openapi({ref: 'sales-engagement.email_address'})

export type EmailAddress = z.infer<typeof email_address>

export const phone_number = z
  .object({
    phone_number: z.string(),
    phone_number_type: z.enum(['primary', 'work', 'home', 'mobile', 'other']),
  })
  .openapi({ref: 'sales-engagement.phone_number'})
export type PhoneNumber = z.infer<typeof phone_number>

export const email_addresses = z.array(email_address)

export const phone_numbers = z.array(phone_number)

export const contact = z
  .object({
    id: z.string(),
    first_name: z.string(),
    last_name: z.string(),
    owner_id: z.string(),
    account_id: z.string().optional(),
    job_title: z.string(),
    address,
    email_addresses,
    phone_numbers,
    open_count: z.number(),
    click_count: z.number(),
    reply_count: z.number(),
    bounced_count: z.number(),
    created_at: z.string(),
    updated_at: z.string(),
    is_deleted: z.boolean(),
    last_modified_at: z.string(),
    raw_data: z.object({}).catchall(z.any()).optional(),
  })
  .openapi({ref: 'sales-engagement.contact'})

export const sequence = z
  .object({
    id: z.string(),
    name: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    is_deleted: z.boolean(),
    last_modified_at: z.string(),
    owner_id: z.string(),
    tags: z.array(z.string()),
    num_steps: z.number(),
    metrics: z.object({}).catchall(z.any()).optional(),
    is_enabled: z.boolean(),
    raw_data: z.object({}).catchall(z.any()).optional(),
  })
  .openapi({ref: 'sales-engagement.sequence'})

export const account = z
  .object({
    id: z.string(),
    name: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    is_deleted: z.boolean(),
    last_modified_at: z.string(),
    domain: z.string(),
    owner_id: z.string(),
    raw_data: z.object({}).catchall(z.any()).optional(),
  })
  .openapi({ref: 'sales-engagement.account'})

export const sequenceState = z
  .object({
    id: z.string(),
    state: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    is_deleted: z.boolean(),
    last_modified_at: z.string(),
    sequence_id: z.string(),
    contact_id: z.string(),
    mailbox_id: z.string(),
    user_id: z.string(),
    raw_data: z.object({}).catchall(z.any()).optional(),
  })
  .openapi({ref: 'sales-engagement.sequenceState'})

export const mailbox = z
  .object({
    id: z.string(),
    email: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    is_deleted: z.boolean(),
    last_modified_at: z.string(),
    user_id: z.string(),
    raw_data: z.object({}).catchall(z.any()).optional(),
  })
  .openapi({ref: 'sales-engagement.mailbox'})

export const user = z
  .object({
    id: z.string(),
    first_name: z.string(),
    last_name: z.string(),
    email: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    is_deleted: z.boolean(),
    last_modified_at: z.string(),
    raw_data: z.object({}).catchall(z.any()).optional(),
  })
  .openapi({ref: 'sales-engagement.user'})
