import type {Oas_crm_contacts, Oas_crm_owners} from '@opensdks/sdk-hubspot'
import {mapper, z, zBaseRecord, zCast} from '@openint/vdk'
import type {PipelineStageMapping} from '.'
import * as unified from '../../unifiedModels'

export type SimplePublicObject =
  Oas_crm_contacts['components']['schemas']['SimplePublicObject']
export type Owner = Oas_crm_owners['components']['schemas']['PublicOwner']

export const HUBSPOT_OBJECT_SINGULAR_TO_PLURAL = {
  company: 'companies',
  contact: 'contacts',
  deal: 'deals',
  line_item: 'line_items',
  product: 'products',
  ticket: 'tickets',
  quote: 'quotes',
  call: 'calls',
  communication: 'communications',
  email: 'emails',
  meeting: 'meetings',
  note: 'notes',
  postal_mail: 'postal_mails',
  task: 'tasks',
  // Technically not a "standard" object, but we are treating it as such
  owner: 'owners',
} as const

export type HubspotObjectTypeSingular =
  keyof typeof HUBSPOT_OBJECT_SINGULAR_TO_PLURAL
export type HubspotObjectTypePlural =
  (typeof HUBSPOT_OBJECT_SINGULAR_TO_PLURAL)[HubspotObjectTypeSingular]

export const HSAssociation = z.object({
  id: z.string().describe('Id of the related object'),
  type: z.string().openapi({
    examples: ['contact_to_company', 'contact_to_company_unlabeled'],
  }),
})

export const HSAssociations = z.record(
  // Technically can be anything... but we are only using `companies` for now
  z.string().openapi({
    example: 'companies',
    description: 'pluralized form object type',
  }),
  z.union([z.undefined(), z.object({results: z.array(HSAssociation)})]),
)

export const HSBase = z.object({
  id: z.string(),
  properties: z
    .object({
      hs_object_id: z.string(),
      createdate: z.string().nullish(),
      lastmodifieddate: z.string().nullish(),
      hs_lastmodifieddate: z.string().nullish(),
    })
    .passthrough(),
  associations: HSAssociations.nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
  archived: z.boolean(),
})
export const HSContact = z.object({
  id: z.string(),
  properties: z
    .object({
      hs_object_id: z.string(),
      hs_lastmodifieddate: z.string().nullish(),
      createdate: z.string().nullish(),
      lastmodifieddate: z.string().nullish(),
      // properties specific to contacts below...
      email: z.string().nullish(),
      phone: z.string().nullish(),
      firstname: z.string().nullish(),
      lastname: z.string().nullish(),
    })
    .passthrough(),
  associations: HSAssociations.nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
  archived: z.boolean(),
})
export const HSDeal = z.object({
  id: z.string(),
  properties: z
    .object({
      hs_object_id: z.string(),
      createdate: z.string().nullish(),
      lastmodifieddate: z.string().nullish(),
      // properties specific to opportunities below...
      dealname: z.string().nullish(),
      hubspot_owner_id: z.string().nullish(),
      notes_last_updated: z.string().nullish(), // Assuming lastActivityAt is a string in HubSpot format
      dealstage: z.string().nullish(),
      pipeline: z.string().nullish(),
      closedate: z.string().nullish(), // Assuming closeDate is a string in HubSpot format
      description: z.string().nullish(),
      amount: z.string().nullish(),
      hs_is_closed_won: z.string().nullish(),
      hs_is_closed: z.string().nullish(),

      // account_id: z.string().nullish(),
      // status: z.string().nullish(),
      is_deleted: z.boolean().nullish(), // Does this exist?
      archivedAt: z.string().nullish(), // Does this exist?
    })
    .passthrough(),
  associations: HSAssociations.nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
  archived: z.boolean(),
  /** toObjectType => toObjectId[] */
  '#pipelineStageMapping': zCast<PipelineStageMapping>(),
})
export const HSNote = z.object({
  id: z.string(),
  // https://gist.github.com/tonyxiao/5128bdeba29f0201f5062395e4a2545b
  properties: z
    .object({
      hs_all_accessible_team_ids: z.unknown(),
      hs_all_assigned_business_unit_ids: z.unknown(),
      hs_all_owner_ids: z.string(),
      hs_all_team_ids: z.unknown(),
      hs_at_mentioned_owner_ids: z.unknown(),
      hs_attachment_ids: z.unknown(),
      hs_body_preview: z.string(),
      hs_body_preview_html: z.string(),
      hs_body_preview_is_truncated: z.string(),
      hs_created_by: z.string(),
      hs_created_by_user_id: z.string(),
      hs_createdate: z.string(),
      hs_engagement_source: z.string(),
      hs_engagement_source_id: z.unknown(),
      hs_follow_up_action: z.unknown(),
      hs_gdpr_deleted: z.unknown(),
      hs_lastmodifieddate: z.string(),
      hs_merged_object_ids: z.unknown(),
      hs_modified_by: z.string(),
      hs_note_body: z.string(),
      hs_note_ms_teams_payload: z.unknown(),
      hs_object_id: z.string(),
      hs_object_source: z.string(),
      hs_object_source_detail_1: z.unknown(),
      hs_object_source_detail_2: z.unknown(),
      hs_object_source_detail_3: z.unknown(),
      hs_object_source_id: z.string(),
      hs_object_source_label: z.string(),
      hs_object_source_user_id: z.string(),
      hs_product_name: z.unknown(),
      hs_queue_membership_ids: z.unknown(),
      hs_read_only: z.unknown(),
      hs_shared_team_ids: z.unknown(),
      hs_shared_user_ids: z.unknown(),
      hs_timestamp: z.string(),
      hs_unique_creation_key: z.unknown(),
      hs_unique_id: z.unknown(),
      hs_updated_by_user_id: z.string(),
      hs_user_ids_of_all_notification_followers: z.unknown(),
      hs_user_ids_of_all_notification_unfollowers: z.unknown(),
      hs_user_ids_of_all_owners: z.string(),
      hs_was_imported: z.unknown(),
      hubspot_owner_assigneddate: z.string(),
      hubspot_owner_id: z.string(),
      hubspot_team_id: z.unknown(),
    })
    .partial()
    .passthrough(),
  associations: HSAssociations.nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
  archived: z.boolean(),
})
export const HSCompany = z.object({
  id: z.string(),
  properties: z
    .object({
      hs_object_id: z.string(),
      createdate: z.string().nullish(),
      lastmodifieddate: z.string().nullish(),
      name: z.string().nullish(),
      description: z.string().nullish(),
      hubspot_owner_id: z.string().nullish(),
      industry: z.string().nullish(),
      website: z.string().nullish(),
      numberofemployees: z.string().nullish(),
      addresses: z.string().nullish(), // Assuming addresses is a string; adjust the type if needed
      phonenumbers: z.string().nullish(), // Assuming phonenumbers is a string; adjust the type if needed
      lifecyclestage: z.string().nullish(),
      notes_last_updated: z.string().nullish(),
    })
    .passthrough(),
  associations: HSAssociations.nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
  archived: z.boolean(),
})

export const associationsToFetch = {
  contact: ['company'],
  deal: ['company'],
  note: ['company'],
}
export const propertiesToFetch = {
  company: [
    'hubspot_owner_id',
    'description',
    'industry',
    'website',
    'domain',
    'hs_additional_domains',
    'numberofemployees',
    'address',
    'address2',
    'city',
    'state',
    'country',
    'zip',
    'phone',
    'notes_last_updated',
    'lifecyclestage',
    'createddate',
  ],
  contact: [
    'address', // TODO: IP state/zip/country?
    'address2',
    'city',
    'country',
    'email',
    'fax',
    'firstname',
    'hs_createdate', // TODO: Use this or createdate?
    'hs_is_contact', // TODO: distinguish from "visitor"?
    'hubspot_owner_id',
    'lifecyclestage',
    'lastname',
    'mobilephone',
    'phone',
    'state',
    'work_email',
    'zip',
  ],
  deal: [
    'dealname',
    'description',
    'amount',
    'hubspot_owner_id',
    'notes_last_updated',
    'closedate',
    'dealstage',
    'pipeline',
    'hs_is_closed_won',
    'hs_is_closed',
  ],
  note: [],
}

export const mappers = {
  companies: mapper(HSCompany, unified.account, {
    id: 'id',
    name: 'properties.name',
    updated_at: (record) => new Date(record.updatedAt).toISOString(),
    is_deleted: (record) => !!record.archived,
    website: 'properties.website',
    industry: 'properties.industry',
    number_of_employees: (record) =>
      record.properties.numberofemployees
        ? Number.parseInt(record.properties.numberofemployees, 10)
        : null,
    owner_id: 'properties.hubspot_owner_id',
    created_at: (record) => new Date(record.createdAt).toISOString(),
  }),
  contacts: mapper(HSContact, unified.contact, {
    id: 'id',
    first_name: 'properties.firstname',
    last_name: 'properties.lastname',
    email: 'properties.email',
    phone: 'properties.phone',
    updated_at: (record) => new Date(record.updatedAt).toISOString(),
  }),
  opportunities: mapper(HSDeal, unified.opportunity, {
    id: 'id',
    name: 'properties.dealname',
    description: 'properties.description',
    owner_id: 'properties.hubspot_owner_id',
    status: (record) =>
      record.properties.hs_is_closed_won
        ? 'WON'
        : record.properties.hs_is_closed
          ? 'LOST'
          : 'OPEN',
    stage: (r) =>
      r['#pipelineStageMapping'][r.properties.pipeline ?? '']?.stageLabelById?.[
        r.properties.dealstage ?? ''
      ],
    account_id: (r) => r.associations?.['companies']?.results?.[0]?.id,
    close_date: 'properties.closedate',
    amount: (record) =>
      record.properties.amount
        ? Number.parseFloat(record.properties.amount)
        : null,
    last_activity_at: 'properties.notes_last_updated',
    created_at: 'properties.createdate',
    // TODO: take into account archivedAt if needed
    updated_at: (record) => new Date(record.updatedAt).toISOString(),
    last_modified_at: (record) => new Date(record.updatedAt).toISOString(),
  }),
  notes: mapper(HSNote, unified.note, {
    id: 'id',
    // notes body is full HTML, so we are using the preview for simplicity
    content: 'properties.hs_body_preview',
    // created_at: 'properties.createdate',
    updated_at: (record) => new Date(record.updatedAt).toISOString(),
    // last_modified_at: (record) => new Date(record.updatedAt).toISOString(),
  }),
  leads: mapper(HSBase, unified.lead, {
    id: 'id',
    updated_at: (record) => new Date(record.updatedAt).toISOString(),
  }),
  users: mapper(zCast<Owner>(), unified.user, {
    id: 'id',
    updated_at: 'updatedAt',
    created_at: 'createdAt',
    last_modified_at: 'updatedAt',
    name: (o) => [o.firstName, o.lastName].filter((n) => !!n?.trim()).join(' '),
    email: 'email',
    is_active: (record) => !record.archived, // Assuming archived is a boolean
    is_deleted: (record) => !!record.archived, // Assuming archived is a boolean
  }),
  customObjects: mapper(HSBase, zBaseRecord, {
    id: 'id',
    updated_at: 'properties.hs_lastmodifieddate',
  }),
}
const HSProperties = z.record(z.string())
const HSObject = z.object({
  properties: HSProperties,
  /**
 * "associations": [
    {
     "to": {
        "id": 301
      },
      "types": [
        {
          "associationCategory": "HUBSPOT_DEFINED",
          "associationTypeId": 190
        } ]
    },
    {
     "to": {
        "id": 401
      },
      "types": [
        {
          "associationCategory": "HUBSPOT_DEFINED",
          "associationTypeId": 214
        } ]
}]
 */
  // associations: z.any().optional(), // for now
  associations: z
    .array(
      z.object({
        to: z.object({id: z.string()}),
        types: z.array(
          z.object({
            associationCategory: z.enum([
              'HUBSPOT_DEFINED',
              'USER_DEFINED',
              'INTEGRATOR_DEFINED',
            ]),
            associationTypeId: z.number(),
          }),
        ),
      }),
    )
    .optional(),
})

// const reverse_address = mapper(unified.address, zHSProperties, {
//   address: (addr) => addr?.street_1 ?? '',
//   // TODO: Support address2 for companies only
//   city: (addr) => addr?.city ?? '',
//   state: (addr) => addr?.state ?? '',
//   zip: (addr) => addr?.postal_code ?? '',
//   country: (addr) => addr?.country ?? '',
// })

// const reverse_phone_numbers = mapper(
//   z.array(unified.phone_number),
//   zHSProperties,
//   {
//     phone: (phones) =>
//       phones.find((p) => p.phone_number_type === 'primary')?.phone_number ?? '',
//     mobilephone: (phones) =>
//       phones.find((p) => p.phone_number_type === 'mobile')?.phone_number ?? '',
//     fax: (phones) =>
//       phones.find((p) => p.phone_number_type === 'fax')?.phone_number ?? '',
//   },
// )

function getIfObject(
  props: Record<string, unknown> | null | undefined,
  key: string,
) {
  return props?.[key] != null && typeof props[key] === 'object'
    ? (props[key] as Record<string, unknown>)
    : {}
}

/** destinations mappers */
export const reverseMappers = {
  companies_input: mapper(unified.account_input, HSObject, (input) => ({
    ...input.passthrough_fields,
    properties: removeUndefinedValues({
      // We will remove undefined values later... Though it's arguable this is stil the right approach
      // for mapping when it got so complicated
      name: nullToEmptyString(input.name),
      industry: nullToEmptyString(input.industry),
      description: nullToEmptyString(input.description),
      website: nullToEmptyString(input.website),
      numberofemployees: nullToEmptyString(
        input.number_of_employees?.toString(),
      ),
      lifecyclestage: nullToEmptyString(input.lifecycle_stage),
      hubspot_owner_id: nullToEmptyString(input.owner_id),
      // only primary phone is supported for hubspot accounts
      phone:
        input.phone_numbers?.find((p) => p.phone_number_type === 'primary')
          ?.phone_number ?? undefined,
      address: input.addresses?.[0]?.street_1 ?? undefined,
      // NOTE: Support address2 for companies only
      city: input.addresses?.[0]?.city ?? undefined,
      state: input.addresses?.[0]?.state ?? undefined,
      zip: input.addresses?.[0]?.postal_code ?? undefined,
      country: input.addresses?.[0]?.country ?? undefined,
      ...getIfObject(input.passthrough_fields, 'properties'),
    }),
  })),
  contacts_input: mapper(unified.contact_input, HSObject, (input) => ({
    ...input.passthrough_fields,
    properties: removeUndefinedValues({
      last_name: nullToEmptyString(input.last_name),
      first_name: nullToEmptyString(input.first_name),
      email: nullToEmptyString(input.email),
      phone: nullToEmptyString(input.phone),
      ...getIfObject(input.passthrough_fields, 'properties'),
    }),
  })),
  notes_input: mapper(unified.note_input, HSObject, (input) => ({
    ...input.passthrough_fields,
    properties: removeUndefinedValues({
      // https://developers.hubspot.com/docs/api/crm/notes
      hs_timestamp: new Date().toISOString(), // TODO Allow this to be passed in...
      hs_note_body: nullToEmptyString(input.content),
      ...getIfObject(input.passthrough_fields, 'properties'),
    }),
    associations: input.account_id
      ? [toAssociation('note_to_company', input.account_id)]
      : [],
  })),
}

function toAssociation(type: 'note_to_company', toObjectId: string) {
  /** https://developers.hubspot.com/docs/api/crm/associations#association-type-id-values */
  const associationTypeId = {
    note_to_company: 190,
  }[type]

  if (associationTypeId === undefined) {
    throw new Error(`Unknown association type: ${type}`)
  }
  return {
    // to: {id: Number.parseInt(toObjectId, 10)},
    // apparently we are happy with string?!
    to: {id: toObjectId},
    types: [
      {associationCategory: 'HUBSPOT_DEFINED' as const, associationTypeId},
    ],
  }
}

// MARK: - Utils

const removeValues = (
  obj: Record<string, unknown>,
  fn: (k: string, v: unknown) => boolean,
) => {
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
  Object.keys(obj).forEach((key) => (fn(key, obj[key]) ? delete obj[key] : {}))
  return obj
}

const removeUndefinedValues = <T extends Record<string, unknown>>(
  obj: T,
): {[k in keyof T]: Exclude<T[k], undefined>} =>
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any
  removeValues(obj, (_, v) => v === undefined) as any

const nullToEmptyString = (
  value: string | undefined | null,
): string | undefined => (value === null ? '' : value)
