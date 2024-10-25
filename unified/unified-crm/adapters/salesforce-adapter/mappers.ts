import type {SalesforceSDKTypes} from '@opensdks/sdk-salesforce'
import {mapper, z, zBaseRecord, zCast} from '@openint/vdk'
import * as unified from '../../unifiedModels'

// import {updateFieldPermissions} from './salesforce/updatePermissions'

export type SFDC = SalesforceSDKTypes['oas']['components']['schemas']

export const CustomSObject = z
  .object({Id: z.string(), SystemModstamp: z.string()})
  .passthrough()

export const mappers = {
  contact: mapper(zCast<SFDC['ContactSObject']>(), unified.contact, {
    id: 'Id',
    updated_at: 'SystemModstamp',
    first_name: 'FirstName',
    last_name: 'LastName',
    email: 'Email',
    phone: 'Phone',
  }),
  account: mapper(zCast<SFDC['AccountSObject']>(), unified.account, {
    id: 'Id',
    updated_at: 'SystemModstamp',
    name: 'Name',
    is_deleted: 'IsDeleted',
    website: 'Website',
    industry: 'Industry',
    number_of_employees: 'NumberOfEmployees',
    owner_id: 'OwnerId',
    created_at: (record) =>
      record.CreatedDate ? new Date(record.CreatedDate).toISOString() : '',
  }),
  opportunity: mapper(
    zCast<SFDC['OpportunitySObject']>(),
    unified.opportunity,
    {
      id: 'Id',
      name: 'Name',
      description: 'Description',
      owner_id: 'OwnerId',
      status: (record) =>
        record.IsWon ? 'WON' : record.IsClosed ? 'LOST' : 'OPEN',
      stage: 'StageName',
      close_date: 'CloseDate', // sfdc already uses iso8601 format
      account_id: 'AccountId',
      // pipeline is not supported in s fdc
      amount: 'Amount',
      last_activity_at: 'LastActivityDate',
      created_at: 'CreatedDate',
      updated_at: 'SystemModstamp',
      is_deleted: 'IsDeleted', // supaglue had it as string but we are actually getting back boolean
      last_modified_at: 'SystemModstamp',
    },
  ),
  lead: mapper(zCast<SFDC['LeadSObject']>(), unified.lead, {
    id: 'Id',
    updated_at: 'SystemModstamp',
    name: 'Name',
    first_name: 'FirstName',
    last_name: 'LastName',
    owner_id: 'OwnerId',
    title: 'Title',
    company: 'Company',
    converted_date: (record) =>
      record.ConvertedDate ? new Date(record.ConvertedDate).toISOString() : '',
    lead_source: 'LeadSource',
    converted_account_id: 'ConvertedAccountId',
    converted_contact_id: 'ConvertedContactId',
    addresses: (record) =>
      record.Street ||
      record.City ||
      record.State ||
      record.Country ||
      record.PostalCode
        ? [
            {
              street_1: record.Street ?? null,
              street_2: null,
              city: record.City ?? null,
              state: record.State ?? null,
              country: record.Country ?? null,
              postal_code: record.PostalCode ?? null,
              address_type: unified.address_type.enum.primary,
            },
          ]
        : [],
    email_addresses: (record) =>
      record.Email
        ? [
            {
              email_address: record.Email,
              email_address_type: unified.email_address_type.enum.primary,
            },
          ]
        : [],
    phone_numbers: (record) =>
      record.Phone
        ? [
            {
              phone_number: record.Phone ?? null,
              phone_number_type: unified.phone_number_type.enum.primary,
            },
          ]
        : [],
    created_at: (record) =>
      record.CreatedDate ? new Date(record.CreatedDate).toISOString() : '',
    is_deleted: 'IsDeleted',
    last_modified_at: (record) =>
      record.SystemModstamp
        ? new Date(record.SystemModstamp).toISOString()
        : '',
  }),
  user: mapper(zCast<SFDC['UserSObject']>(), unified.user, {
    id: 'Id',
    name: 'Name',
    email: 'Email',
    is_active: 'IsActive',
    updated_at: 'SystemModstamp',
    created_at: (record) =>
      record.CreatedDate ? new Date(record.CreatedDate).toISOString() : '',
    last_modified_at: (record) =>
      record.CreatedDate ? new Date(record.CreatedDate).toISOString() : '',
  }),
  customObject: mapper(CustomSObject, zBaseRecord, {
    id: 'Id',
    updated_at: 'SystemModstamp',
  }),
}

/** Properties to fetch for common object */
const propertiesForCommonObject = {
  account: [
    'OwnerId',
    'Name',
    'Description',
    'Industry',
    'Website',
    'NumberOfEmployees',
    // We may not need all of these fields in order to map to common object
    'BillingCity',
    'BillingCountry',
    'BillingPostalCode',
    'BillingState',
    'BillingStreet',
    // We may not need all of these fields in order to map to common object
    'ShippingCity',
    'ShippingCountry',
    'ShippingPostalCode',
    'ShippingState',
    'ShippingStreet',
    'Phone',
    // 'Fax', // Not All accounts have the `Fax` field. 65b28b35e43f25d0823a26d6 is notably missing it...
    'LastActivityDate',
    'CreatedDate',
    'IsDeleted',
  ] satisfies Array<keyof SFDC['AccountSObject']>,
  contact: [
    'OwnerId',
    'AccountId',
    'FirstName',
    'LastName',
    'Email',
    'Phone',
    'Fax',
    'MobilePhone',
    'LastActivityDate',
    // We may not need all of these fields in order to map to common object
    'MailingCity',
    'MailingCountry',
    'MailingPostalCode',
    'MailingState',
    'MailingStreet',
    // We may not need all of these fields in order to map to common object
    // TODO: We should really use the metadata API to list all the props available instead of doing it like this...
    // 'OtherCity', // not universal, does not exist for customer 65a69f996a1ed263b3486feb
    // 'OtherCountry',
    // 'OtherPostalCode',
    // 'OtherState',
    // 'OtherStreet',
    'IsDeleted',
    'CreatedDate',
  ] satisfies Array<keyof SFDC['ContactSObject']>,
  opportunity: [
    'OwnerId',
    'Name',
    'Description', // Even this field can be null for some customers (e.g. 6580d11eda0dd92961348262). Really need to use metadata API
    'LastActivityDate',
    'Amount',
    'IsClosed',
    'IsDeleted',
    'IsWon',
    'StageName',
    'CloseDate',
    'CreatedDate',
    'AccountId',
  ] satisfies Array<keyof SFDC['OpportunitySObject']>,
  lead: [
    'OwnerId',
    'Title',
    'FirstName',
    'LastName',
    'ConvertedDate',
    'CreatedDate',
    'ConvertedContactId',
    'ConvertedAccountId',
    'Company',
    'City',
    'State',
    'Street',
    'Country',
    'PostalCode',
    'Phone',
    'Email',
    'IsDeleted',
  ] satisfies Array<keyof SFDC['LeadSObject']>,
  user: ['Name', 'Email', 'IsActive', 'CreatedDate'] satisfies Array<
    keyof SFDC['UserSObject']
  >,
}

// HACK ALERT: Some customers are missing standard sfdc fields, but we also don't have the permission
// to read metadata endpoint to filter them out. So instead we are gonna hard code it for now until we figure out a workaround.
export function listFields<T extends keyof typeof propertiesForCommonObject>(
  objectType: T,
  ctx: {remote: {customerId: string}},
) {
  const fields = propertiesForCommonObject[objectType]

  if (
    objectType === 'opportunity' &&
    ['63aca2d6213def0014837f98', '6580d11eda0dd92961348262'].includes(
      ctx.remote.customerId,
    )
  ) {
    return fields.filter((f) => f !== 'Description') as typeof fields
  }

  if (
    objectType === 'account' &&
    ctx.remote.customerId === '63aca2d6213def0014837f98'
  ) {
    return fields.filter(
      (f) =>
        ![
          'ShippingCity',
          'ShippingCountry',
          'ShippingPostalCode',
          'ShippingState',
          'ShippingStreet',
        ].includes(f),
    ) as typeof fields
  }
  return fields
}

export function capitalizeFirstChar(str: string): string {
  if (!str) {
    return str
  }
  return str.charAt(0).toUpperCase() + str.slice(1)
}
