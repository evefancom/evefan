import {z, zBaseRecord} from '@openint/vdk'

export const address_type = z
  .enum(['primary', 'mailing', 'other', 'billing', 'shipping'])
  .openapi({ref: 'crm.address_type'})

export const address = z
  .object({
    /** @enum {string} */
    address_type,
    /** @example San Francisco */
    city: z.string().nullable(),
    /** @example USA */
    country: z.string().nullable(),
    /** @example 94107 */
    postal_code: z.string().nullable(),
    /** @example CA */
    state: z.string().nullable(),
    /** @example 525 Brannan */
    street_1: z.string().nullable(),
    /** @example null */
    street_2: z.string().nullable(),
  })
  .openapi({ref: 'crm.address'})

export const email_address_type = z
  .enum(['primary', 'work', 'other'])
  .openapi({ref: 'crm.email_address_type'})

export const email_address = z
  .object({
    /** @example hello@openint.com */
    email_address: z.string(),

    email_address_type,
  })
  .openapi({ref: 'crm.email_address'})

export const phone_number_type = z
  .enum(['primary', 'mobile', 'fax', 'other'])
  .openapi({ref: 'crm.phone_number_type'})

export const phone_number = z.object({
  /** @example +14151234567 */
  phone_number: z.string().nullable(),

  phone_number_type,
})

export const lifecycle_stage = z
  .enum([
    'subscriber',
    'lead',
    'marketingqualifiedlead',
    'salesqualifiedlead',
    'opportunity',
    'customer',
    'evangelist',
    'other',
  ])
  .openapi({ref: 'crm.lifecycle_stage'})

export const account = zBaseRecord
  .extend({
    name: z.string().nullish(),
    is_deleted: z.boolean().nullish(),
    website: z.string().nullish(),
    industry: z.string().nullish(),
    number_of_employees: z.number().nullish(),
    owner_id: z.string().nullish(),
    created_at: z.string().nullish(),
    // not implemented yet
    description: z.string().nullish().openapi({example: 'Integration API'}),
    last_activity_at: z.string().nullish().describe('date-time'),
    addresses: z.array(address).nullish(),
    phone_numbers: z.array(phone_number).nullish(),
    lifecycle_stage: lifecycle_stage.nullish(),
    last_modified_at: z.string().nullish(),
  })
  .openapi({ref: 'crm.account'})

export const contact = zBaseRecord
  .extend({
    first_name: z.string().nullish(),
    last_name: z.string().nullish(),
    email: z.string().nullish().describe('Primary email address'),
    phone: z.string().nullish().describe('Primary phone number'),
  })
  .openapi({ref: 'crm.contact'})

export const lead = zBaseRecord
  .extend({
    name: z.string().nullish(),
    first_name: z.string().nullish(),
    last_name: z.string().nullish(),
    owner_id: z.string().nullish(),
    title: z.string().nullish(),
    company: z.string().nullish(),
    converted_date: z.string().nullish(),
    lead_source: z.string().nullish(),
    converted_account_id: z.string().nullish(),
    converted_contact_id: z.string().nullish(),
    addresses: z.array(address).nullish(),
    email_addresses: z.array(email_address).nullish(),
    phone_numbers: z.array(phone_number).nullish(),
    created_at: z.string().nullish(),
    is_deleted: z.boolean().nullish(),
    last_modified_at: z.string().nullish(),
  })
  .openapi({ref: 'crm.lead'})

export const note = zBaseRecord
  .extend({
    content: z.string().nullish(),
  })
  .openapi({ref: 'crm.note'})

export const opportunity_status = z
  .enum(['OPEN', 'WON', 'LOST'])
  .openapi({ref: 'crm.opportunity_status'})

export const opportunity = zBaseRecord
  .extend({
    name: z.string().nullish(),
    description: z.string().nullish(),
    owner_id: z.string().nullish(),
    status: opportunity_status.nullish(),
    stage: z.string().nullish(),
    close_date: z.string().nullish(),
    account_id: z.string().nullish(),
    pipeline: z.string().nullish(),
    amount: z.number().nullish(),
    last_activity_at: z.string().nullish(),
    created_at: z.string().nullish(),
    is_deleted: z.boolean().nullish(),
    last_modified_at: z.string().nullish(),
  })
  .openapi({ref: 'crm.opportunity'})

export const user = zBaseRecord
  .extend({
    name: z.string().nullish(),
    email: z.string().nullish(),
    is_active: z.boolean().nullish(),
    created_at: z.string().nullish(),
    is_deleted: z.boolean().nullish(),
    last_modified_at: z.string().nullish(),
  })
  .openapi({ref: 'crm.user'})

// MARK: - Meta

export const meta_object = z
  .object({
    // Custom object does not always have an id
    id: z.string(),
    name: z.string(),
  })
  .openapi({ref: 'crm.meta.object'})

export const meta_property = z
  .object({
    id: z.string().openapi({
      description:
        'The machine name of the property as it appears in the third-party Provider',
      example: 'FirstName',
    }),
    label: z.string().openapi({
      description:
        'The human-readable name of the property as provided by the third-party Provider.',
      example: 'First Name',
    }),
    type: z.string().optional().openapi({
      description:
        'The type of the property as provided by the third-party Provider. These types are not unified by OpenInt. For Intercom, this is string, integer, boolean, or object. For Outreach, this is integer, boolean, number, array, or string.',
      example: 'string',
    }),
    raw_details: z.record(z.unknown()).optional().openapi({
      description:
        'The raw details of the property as provided by the third-party Provider, if available.',
      example: {},
    }),
  })
  .openapi({ref: 'crm.meta.property'})

export const meta_property_type = z
  .enum([
    'text',
    'textarea',
    'number',
    'picklist',
    'multipicklist',
    'date',
    'datetime',
    'boolean',
    'url',
    'other',
  ])
  .openapi({
    ref: 'crm.meta.property_type',
    description: `
:::note
\`picklist\` and \`multipicklist\` property types are currently only supported in Salesforce and Hubspot
:::

:::note
\`url\` property type currently is only natively supported in Salesforce.
:::`.trim(),
  })

export const meta_association_schema = z
  .object({
    id: z.string(),
    source_object: z.string().openapi({example: 'contact'}),
    target_object: z.string().openapi({example: 'my_custom_object'}),
    display_name: z.string(),
  })
  .openapi({ref: 'crm.meta.association_schema'})

export const meta_pick_list_option = z
  .object({
    label: z.string().openapi({example: 'Option 1'}),
    value: z.string().openapi({example: 'option_1'}),
    description: z.string().optional(),
    hidden: z.boolean().optional().describe('Defaults to false.'),
  })
  .openapi({ref: 'crm.meta.pick_list_option'})

export const meta_custom_object_field = z
  .object({
    id: z
      .string()
      .describe(
        'The machine name of the property as it appears in the third-party Provider. In Salesforce, this must end with `__c`.',
      ),
    label: z
      .string()
      .describe(
        'The human-readable name of the property as provided by the third-party Provider.',
      ),
    description: z.string().describe('A description of the field.').optional(),
    is_required: z
      .boolean()
      .describe(
        'Whether or not this field is required. Must be false for Salesforce boolean fields.',
      )
      .optional(),
    default_value: z
      .union([z.string(), z.number(), z.boolean()])
      .optional()
      .describe(
        'The default value for the property. Only supported for Salesforce.',
      ),
    group_name: z.string().optional().openapi({
      description:
        "Only applicable for Hubspot. If specified, OpenInt will attempt to attach the field to this group if it exists, or create it if it doesn't.",
      example: 'my group',
    }),
    type: meta_property_type,
    precision: z
      .number()
      .describe(
        'Only applicable in Salesforce. If not given, will default to 18.',
      )
      .optional(),
    scale: z
      .number()
      .describe(
        'Only applicable in Salesforce. If not given, will default to 0.',
      )
      .optional(),
    options: z
      .array(meta_pick_list_option)
      .describe('The list of options for a picklist/multipicklist field.')
      .optional(),
    raw_details: z
      .record(z.unknown())
      .describe(
        'The raw details of the property as provided by the third-party Provider, if available.',
      )
      .optional(),
  })
  .openapi({ref: 'crm.meta.custom_object_field'})

export const account_input = account
  .pick({
    /** @example Integration API */
    description: true,
    /** @example API's */
    industry: true,
    /** @example Sample Customer */
    name: true,
    /** @example 276000 */
    number_of_employees: true,
    website: true,
    addresses: true,
    phone_numbers: true,
    /** @example 9f3e97fd-4d5d-4efc-959d-bbebfac079f5 */
    owner_id: true,
    lifecycle_stage: true,
  })
  .partial()
  .extend({
    passthrough_fields: z.record(z.unknown()).nullish(),
  })
  .openapi({ref: 'crm.account_input'})

export const contact_input = contact
  .pick({
    /** @example George */
    first_name: true,
    /** @example Xing */
    last_name: true,
    email: true,
    phone: true,
    // /** @example 64571bff-48ea-4469-9fa0-ee1a0bab38bd */
    // account_id: true,
    // addresses: true,
    // email_addresses: true,
    // phone_numbers: true,
    // /** @example 9f3e97fd-4d5d-4efc-959d-bbebfac079f5 */
    // owner_id: true,
    // lifecycle_stage: true,
  })
  .partial()
  .extend({
    passthrough_fields: z.record(z.unknown()).nullish(),
  })
  .openapi({ref: 'crm.contact_input'})

export const note_input = note
  .pick({
    content: true,
  })
  .partial()
  .extend({
    passthrough_fields: z.record(z.unknown()).nullish(),
    account_id: z
      .string()
      .optional()
      .describe('The ID of the company to associate the note to.'),
  })
  .openapi({ref: 'crm.note_input'})
