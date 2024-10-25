import {type SalesforceSDK as _SalesforceSDK} from '@opensdks/sdk-salesforce'
// import * as jsforce from 'jsforce'
import type {BaseRecord} from '@openint/vdk'
import {LastUpdatedAtId, uniqBy} from '@openint/vdk'
import type {CRMAdapter} from '../../router'
import {SALESFORCE_STANDARD_OBJECTS} from './constants'
// import {salesforceProviderJsForce} from './jsforce'
import {capitalizeFirstChar, listFields, mappers} from './mappers'

type SalesforceSDK = _SalesforceSDK & {
  // getJsForce: () => Promise<jsforce.Connection>
}

/**
 * Hard-coded for now, to get list of available versions, visit $instanceUrl/services/data
 * TODO: Consider making this configurable by
 * 1) Exposing ConnectionConfiguration and ConnectionMetadata as part of params to __init__.
 * We don't do that today to reduce 1x roundtrip needed on every request
 * 2) Allow it to be configured on a per request basis via a `x-salesforce-api-version` header.
 * Simpler but we would be forcing the consumer to have to worry about it.
 */

/** SOQL FIELDS function must have a LIMIT of at most 200 */
export const SFDC_SOQL_MAX_LIMIT = 200

function sdkExt(instance: SalesforceSDK) {
  /** NOTE: extract these into a helper functions inside sdk-salesforce */
  const countEntity = async (entity: string) =>
    instance.query(`SELECT COUNT() FROM ${entity}`).then((r) => r.totalSize)

  const listEntity = async <T>({
    cursor,
    includeCustomFields = true,
    ...opts
  }: {
    // to-do: Make entity and fields type safe
    entity: string
    fields: string[]
    /** Default true */
    includeCustomFields?: boolean
    cursor?: {
      last_updated_at: string
      last_id: string
    }
    limit?: number
  }) => {
    const whereStatement = cursor
      ? `WHERE SystemModstamp > ${cursor.last_updated_at} OR (SystemModstamp = ${cursor.last_updated_at} AND Id > '${cursor.last_id}')`
      : ''
    const limitStatement = opts.limit != null ? `LIMIT ${opts.limit}` : ''
    const fields = Array.from(
      new Set([
        'Id',
        'SystemModstamp',
        ...opts.fields,
        ...(includeCustomFields ? ['FIELDS(CUSTOM)'] : []),
      ]),
    )
    return instance.query<T>(`
        SELECT ${fields.join(', ')}
        FROM ${opts.entity}
        ${whereStatement}
        ORDER BY SystemModstamp ASC, Id ASC
        ${limitStatement}
      `)
  }

  return {
    countEntity,
    listEntity,
    _listEntityThenMap: async <TIn, TOut extends BaseRecord>({
      entity,
      mapper,
      cursor: encodedCursor,
      page_size,
      ...opts
    }: {
      entity: string
      mapper: {parse: (rawData: unknown) => TOut; _in: TIn}
      page_size?: number
      cursor?: string | null
      // spreadable
      fields: Array<Extract<keyof TIn, string>>
      /** Default true */
      includeCustomFields?: boolean
    }) => {
      const limit = page_size ?? SFDC_SOQL_MAX_LIMIT
      const cursor = LastUpdatedAtId.fromCursor(encodedCursor)
      const res = await listEntity<TIn>({...opts, entity, cursor, limit})
      const items = res.records.map(mapper.parse)
      const lastItem = items[items.length - 1]
      return {
        items,
        has_next_page: items.length > 0,
        next_cursor: lastItem
          ? LastUpdatedAtId.toCursor({
              last_id: lastItem.id,
              last_updated_at: lastItem.updated_at,
            })
          : encodedCursor,
      }
    },
  }
}

export const salesforceAdapter = {
  countEntity: async ({instance, input}) => {
    // NOTE: extract this into a helper function inside sdk-salesforce
    const res = await instance.query(`SELECT COUNT() FROM ${input.entity}`)
    return {count: res.totalSize}
  },
  // MARK: - Account
  listAccounts: async ({instance, input, ctx}) =>
    sdkExt(instance)._listEntityThenMap({
      entity: 'Account',
      fields: listFields('account', ctx),
      mapper: mappers.account,
      cursor: input?.cursor,
      page_size: input?.page_size,
    }),
  getAccount: async ({instance, input}) => {
    const res = await instance.GET('/sobjects/Account/{id}', {
      params: {path: {id: input.id}},
    })
    return {
      record: mappers.contact.parse(res.data),
      raw: res.data,
    }
  },

  // MARK: - Contact

  listContacts: async ({instance, input, ctx}) =>
    sdkExt(instance)._listEntityThenMap({
      entity: 'Contact',
      fields: listFields('contact', ctx),
      mapper: mappers.contact,
      cursor: input?.cursor,
      page_size: input?.page_size,
    }),
  getContact: async ({instance, input}) => {
    const res = await instance.GET('/sobjects/Contact/{id}', {
      params: {path: {id: input.id}},
    })
    return {
      record: mappers.contact.parse(res.data),
      raw: res.data,
    }
  },

  // MARK: - Opportunity

  listOpportunities: async ({instance, input, ctx}) =>
    sdkExt(instance)._listEntityThenMap({
      entity: 'Opportunity',
      fields: listFields('opportunity', ctx),
      mapper: mappers.opportunity,
      cursor: input?.cursor,
      page_size: input?.page_size,
    }),

  // MARK: - Lead

  listLeads: async ({instance, input, ctx}) =>
    sdkExt(instance)._listEntityThenMap({
      entity: 'Lead',
      fields: listFields('lead', ctx),
      mapper: mappers.lead,
      cursor: input?.cursor,
      page_size: input?.page_size,
    }),

  // MARK: - User

  listUsers: async ({instance, input, ctx}) =>
    sdkExt(instance)._listEntityThenMap({
      entity: 'User',
      fields: listFields('user', ctx),
      mapper: mappers.user,
      cursor: input?.cursor,
      page_size: input?.page_size,
    }),

  listCustomObjectRecords: async ({instance, input}) =>
    sdkExt(instance)._listEntityThenMap({
      entity: ensureCustomObjectSuffix(input.object_name),
      fields: ['Name'],
      mapper: mappers.customObject,
      cursor: input?.cursor,
      page_size: input?.page_size,
    }),

  createCustomObjectRecord: async ({instance, input}) => {
    const objectName = ensureCustomObjectSuffix(input.object_name)
    const res = await instance.POST(`/sobjects/${objectName as 'Account'}`, {
      // sdc-salesforce already defaults to json. Would be good to not have to repeat it due to typing
      params: {header: {'Content-Type': 'application/json'}},
      body: input.record,
    })
    return {record: res.data}
  },

  // MARK: - Metadata

  metadataListObjects: async ({instance, input}) =>
    uniqBy(
      [
        ...(!input.type || input.type === 'standard'
          ? SALESFORCE_STANDARD_OBJECTS.map((name) => ({id: name, name}))
          : []),
        ...(!input.type || input.type === 'custom'
          ? await instance
              .GET('/sobjects')
              .then((res) =>
                (res.data.sobjects ?? [])
                  .filter((s) => s.custom)
                  .map((s) => ({id: s.name ?? '', name: s.name ?? ''})),
              )
          : []),
      ],
      (o) => o.id,
    ),

  metadataListObjectProperties: async ({instance, input}) => {
    const res = await instance.GET('/sobjects/{sObject}/describe', {
      // should we ensure suffix here too?
      params: {path: {sObject: capitalizeFirstChar(input.object_name)}},
    })
    return (res.data.fields ?? [])
      .filter((field) => !COMPOUND_TYPES.includes(field.type ?? ''))
      .map((field) => ({
        id: field.name ?? '',
        label: field.label ?? '',
        type: field.type,
        raw_details: field,
      }))
  },
  // metadataCreateObject: async ({instance, ...opts}) =>
  //   salesforceProviderJsForce.metadataCreateObject({
  //     ...opts,
  //     instance: await instance.getJsForce(),
  //   }),
  // metadataCreateAssociation: async ({instance, ...opts}) =>
  //   salesforceProviderJsForce.metadataCreateAssociation({
  //     ...opts,
  //     instance: await instance.getJsForce(),
  //   }),
} satisfies CRMAdapter<SalesforceSDK>

const COMPOUND_TYPES = ['location', 'address']

function ensureCustomObjectSuffix(name: string) {
  return name.endsWith('__c') ? name : `${name}__c`
}
