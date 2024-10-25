import {z} from '@openint/vdk'

export const offer = z
  .object({
    id: z.string(),
    created_at: z.string(),
    modified_at: z.string(),
    application: z.string().nullish(),
    closed_at: z.string().nullish(),
    sent_at: z.string().nullish(),
    start_date: z.string().nullish(),
    status: z.string().nullish(),
    raw_data: z.record(z.unknown()).optional(),
  })
  .openapi({
    ref: 'ats.offer',
    description: 'An offer to a candidate',
  })

export const department = z
  .object({
    id: z.string().nullish(),
    created_at: z.string().nullish(),
    modified_at: z.string().nullish(),
    name: z.string().nullish(),
    parent_id: z.string().nullish(),
    parent_department_external_id: z.string().nullish(),
    child_ids: z.array(z.string().nullish()).nullish(),
    child_department_external_ids: z.array(z.string().nullish()).nullish(),
    raw_data: z.record(z.unknown()).optional(),
  })
  .openapi({
    ref: 'ats.department',
    description: 'A department in an organization',
  })

export const job = z
  .object({
    id: z.string(),
    created_at: z.string(),
    modified_at: z.string(),
    name: z.string(),
    confidential: z.boolean(),
    departments: z.array(department),
    offices: z.array(z.record(z.unknown())).nullish(),
    hiring_managers: z.unknown(), // TODO: unify this w/ greenhouse if possible.
    recruiters: z.array(z.record(z.unknown())).nullish(),
    raw_data: z.record(z.unknown()).optional(),
  })
  .openapi({
    ref: 'ats.job',
    description: 'An (open) role',
  })

// const phoneNumberSchema = z.object({
//   value: z.string().nullish(),
//   phone_number_type: z.string().nullish(),
// })

// const emailAddressSchema = z.object({
//   value: z.string().email().nullish(),
//   email_address_type: z.string().nullish(),
// })

export const candidate = z
  .object({
    id: z.string(),
    created_at: z.string().nullish(),
    modified_at: z.string().nullish(),
    name: z.string().nullish(),
    first_name: z.string().nullish(),
    last_name: z.string().nullish(),
    company: z.string().nullish(),
    title: z.string().nullish(),
    last_interaction_at: z.string().nullish(),
    is_private: z.boolean().nullish(),
    can_email: z.boolean().nullish(),
    locations: z.array(z.unknown()).nullish(),
    phone_numbers: z.array(z.record(z.unknown())).nullish(),
    email_addresses: z.array(z.record(z.unknown())).nullish(),
    tags: z.array(z.string()).nullish(),
    applications: z.array(z.unknown()).nullish(),
    attachments: z.array(z.unknown()).nullish(),
    raw_data: z.record(z.unknown()).optional(),
  })
  .openapi({
    ref: 'ats.candidate',
    description: 'A candidate for a job',
  })

  
  export const opening = z
    .object({
      id: z.string(),
      created_at: z.string(),
      modified_at: z.string(),
      status: z.string(),
      job_id: z.string(),
      raw_data: z.record(z.unknown()).optional(),
    })
    .openapi({
      ref: 'ats.opening',
      description: 'An opening for a job',
  })
