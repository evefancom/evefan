import type {Oas_crm_schemas} from '@opensdks/sdk-hubspot'
import {type HubspotSDK} from '@opensdks/sdk-hubspot'
import {LRUCache} from 'lru-cache'
import * as RM from 'remeda'
import type {BaseRecord, z} from '@openint/vdk'
import {
  BadRequestError,
  InternalServerError,
  LastUpdatedAtNextOffset,
  NotFoundError,
  uniqBy,
} from '@openint/vdk'
import type {CRMAdapter} from '../../router'
import type {
  HSAssociation,
  HSAssociations,
  HubspotObjectTypePlural,
  HubspotObjectTypeSingular,
} from './mappers'
import {
  associationsToFetch,
  HUBSPOT_OBJECT_SINGULAR_TO_PLURAL,
  mappers,
  propertiesToFetch,
  reverseMappers,
} from './mappers'

const isStandardObjectType = (
  objectType: string,
): objectType is HubspotObjectTypeSingular =>
  HUBSPOT_OBJECT_SINGULAR_TO_PLURAL[objectType as HubspotObjectTypeSingular] !=
  null

/** Hubspot associations are plural form unfortunately... */
function hubspotPluralize(word: string): HubspotObjectTypePlural {
  const plural =
    HUBSPOT_OBJECT_SINGULAR_TO_PLURAL[word as HubspotObjectTypeSingular]
  if (plural) {
    return plural
  }
  // Apply basic pluralization rules
  if (
    word.endsWith('s') ||
    word.endsWith('ch') ||
    word.endsWith('sh') ||
    word.endsWith('x') ||
    word.endsWith('z')
  ) {
    return (word + 'es') as HubspotObjectTypePlural
  } else if (
    word.endsWith('y') &&
    !['a', 'e', 'i', 'o', 'u'].includes(word.charAt(word.length - 2))
  ) {
    return (word.slice(0, -1) + 'ies') as HubspotObjectTypePlural
  } else {
    return (word + 's') as HubspotObjectTypePlural
  }
}
/**
 * In certain cases, Hubspot cannot determine the object type based on just the name for custom objects,
 * so we need to get the ID.
 */
async function getObjectTypeFromNameOrId(
  instance: HubspotSDK,
  nameOrId: string,
): Promise<string> {
  // Standard objects can be referred by name no problem
  if (isStandardObjectType(nameOrId)) {
    return nameOrId
  }
  // isAlreadyObjectTypeId

  if (/^\d+-\d+$/.test(nameOrId)) {
    return nameOrId
  }
  const schemas = await instance.crm_schemas
    .GET('/crm/v3/schemas')
    .then((r) => r.data.results)

  // const schemas = await this.#client.crm.schemas.coreApi.getAll();
  const schemaId = schemas.find(
    (schema) => schema.name === nameOrId || schema.objectTypeId === nameOrId,
  )?.objectTypeId
  if (!schemaId) {
    throw new NotFoundError(
      `Could not find custom object schema with name or id ${nameOrId}`,
    )
  }
  return schemaId
}
const _listObjectsFullThenMap = async <TIn, TOut extends BaseRecord>(
  instance: HubspotSDK,
  {
    objectType,
    ...opts
  }: {
    objectType: HubspotObjectTypePlural
    fields?: string[]
    associations?: string[]
    mapper: {parse: (rawData: unknown) => TOut; _in: TIn}
    page_size?: number
    cursor?: string | null
  },
) => {
  const res =
    objectType === 'owners'
      ? await instance[`crm_${objectType as 'owners'}`].GET(
          `/crm/v3/${objectType as 'owners'}/`,
          {
            params: {
              query: {
                after: opts?.cursor ?? undefined,
                limit: opts?.page_size ?? 100,
              },
            },
          },
        )
      : await instance[`crm_${objectType as 'contacts'}`].GET(
          `/crm/v3/objects/${objectType as 'contacts'}`,
          {
            params: {
              query: {
                after: opts?.cursor ?? undefined,
                limit: opts?.page_size ?? 100,
                properties: opts?.fields ?? undefined,
                associations: opts?.associations ?? undefined,
              },
            },
          },
        )
  return {
    items: res.data.results.map(opts.mapper.parse),
    has_next_page: !!res.data.paging?.next?.after,
    // This would reset the sync and loop back from the beginning, except
    // the has_next_page check prevents that
    next_cursor: res.data.paging?.next?.after,
  }
}

function getApiName(objectType: HubspotObjectTypePlural) {
  const apiName = `crm_${
    (objectType === 'notes' ? 'objects' : objectType) as 'contacts'
  }` as const
  return apiName
}

const _listObjectsIncrementalThenMap = async <TIn, TOut extends BaseRecord>(
  instance: HubspotSDK,
  {
    objectType,
    fields,
    ...opts
  }: {
    objectType: HubspotObjectTypePlural
    fields: string[]
    /** Will use the properties endpoint to fetch all available fields */
    includeAllFields?: boolean
    associations?: string[]
    mapper: {parse: (rawData: unknown) => TOut; _in: TIn}
    page_size?: number
    cursor?: string | null
    // For caching purposes only really...
    ctx: {remote: {customerId: string}}
  },
) => {
  const limit = opts?.page_size ?? 100
  const cursor = LastUpdatedAtNextOffset.fromCursor(opts?.cursor)
  const kUpdatedAt =
    objectType === 'contacts' ? 'lastmodifieddate' : 'hs_lastmodifieddate'
  // We may want to consider using the list rather than search endpoint for this stuff...

  const res = await instance[getApiName(objectType)].POST(
    `/crm/v3/objects/${objectType as 'contacts'}/search`,
    {
      body: {
        properties: Array.from(
          new Set([
            'hs_object_id',
            'createdate',
            'lastmodifieddate',
            'hs_lastmodifieddate',
            'name',
            ...fields,
            ...(opts.includeAllFields
              ? await cachedGetObjectProperties(instance, {
                  customerId: opts.ctx.remote.customerId,
                  objectType,
                })
              : []),
          ]),
        ),
        filterGroups: cursor?.last_updated_at
          ? [
              {
                filters: [
                  {
                    propertyName: kUpdatedAt,
                    operator: 'GTE',
                    value: cursor?.last_updated_at,
                  },
                ],
              },
            ]
          : [],
        after: cursor?.next_offset ?? '',
        sorts: [
          {
            propertyName: kUpdatedAt,
            direction: 'ASCENDING',
          },
          // Cannot sort by multiple values unfortunately...
          // {
          //   propertyName: 'hs_object_id',
          //   direction: 'ASCENDING',
          // },
        ] as unknown as string[],
        limit,
      },
    },
  )

  const batchedAssociations = await Promise.all(
    (opts.associations ?? []).map(async (associatedType) => {
      const toObjectIdsByFromObjectId = await _batchListAssociations(instance, {
        fromObjectIds: res.data.results.map((r) => r.id),
        fromObjectType: objectType,
        toObjectType: associatedType,
      })
      return [associatedType, toObjectIdsByFromObjectId] as const
    }),
  )
  // console.log('associations:', batchedAssociations)
  const pipelineStageMapping =
    objectType === 'deals'
      ? await cachedGetPipelineStageMapping(instance, opts.ctx)
      : undefined

  const resultsExtended = res.data.results.map((rawData) => {
    const associations = Object.fromEntries(
      batchedAssociations.map(([associatedType, toObjectIdsByFromObjectId]) => {
        const toIds = toObjectIdsByFromObjectId[rawData.id] ?? []
        return [hubspotPluralize(associatedType), {results: toIds}]
      }),
    ) satisfies z.infer<typeof HSAssociations>
    // console.log('associations:', associations)

    return {
      ...rawData,
      // polyfill associations that are not normally available from the search endpoint
      associations,
      // Will only be set for deals, never returned by hubspot directly
      '#pipelineStageMapping': pipelineStageMapping,
    }
  })

  const items = resultsExtended.map(opts.mapper.parse)
  const lastItem = items[items.length - 1]
  return {
    items,
    // Not the same as simply items.length === 0
    has_next_page: !!res.data.paging?.next?.after,
    next_cursor:
      (lastItem
        ? LastUpdatedAtNextOffset.toCursor({
            last_updated_at: lastItem.updated_at,
            next_offset:
              // offset / offset-like cursor is only usable if the filtering criteria doesn't change, notably the last_updated_at timestamp
              // in practice this means that we only care about `after` offset when we have more than `limit` number of items modified at the exact
              // same timestamp
              lastItem.updated_at === cursor?.last_updated_at
                ? res.data.paging?.next?.after
                : undefined,
          })
        : opts?.cursor) ?? null,
  }
}

// TODO: implement this when reading batch
export const _batchListAssociations = async (
  instance: HubspotSDK,
  opts: {
    fromObjectIds: string[]
    fromObjectType: string
    toObjectType: string
  },
): Promise<Record<string /*fromId*/, Array<z.infer<typeof HSAssociation>>>> => {
  if (!opts.fromObjectIds.length) {
    return {}
  }
  try {
    const associations = await instance.crm_associations.POST(
      '/{fromObjectType}/{toObjectType}/batch/read',
      {
        params: {
          path: {
            fromObjectType: opts.fromObjectType,
            toObjectType: opts.toObjectType,
          },
        },
        body: {inputs: opts.fromObjectIds.map((id) => ({id}))},
      },
    )
    return associations.data.results
      .map((result) => ({
        [result.from.id]: result.to,
      }))
      .reduce((acc, curr) => ({...acc, ...curr}), {})
  } catch (err) {
    console.log(err)
    throw err
  }
}

const objectPropertiesCache = new LRUCache<
  string /* {customerId}_{objectType} */,
  string[] /* {fieldName}[] */
>({
  ttl: 1000 * 60 * 5,
  ttlAutopurge: false,
  max: 100,
})

const cachedGetObjectProperties = async (
  instance: HubspotSDK,
  opts: {customerId: string; objectType: string},
) => {
  const cacheKey = `${opts.customerId}_${opts.objectType}`
  const cached = objectPropertiesCache.get(cacheKey)
  if (cached) {
    console.log(
      '[hubspot] Using cached available fields for objectType:',
      opts.objectType,
    )
    return cached
  }
  const fields = await instance.crm_properties
    .GET('/crm/v3/properties/{objectType}', {
      params: {path: {objectType: opts.objectType}},
    })
    .then((r) => r.data.results.map((obj) => obj.name))
  objectPropertiesCache.set(cacheKey, fields)
  return fields
}

const pipelineStageMappingCache = new LRUCache<
  string /* {customerId} */,
  PipelineStageMapping
>({
  ttl: 1000 * 60 * 5,
  ttlAutopurge: false,
  max: 100,
})

// TODO: Introduce a proper caching fetchLink based on customerId that can be backed by
// memory cache or redis cache... For now we are just gonna hack around by passing the customerId context around...
const cachedGetPipelineStageMapping = async (
  instance: HubspotSDK,
  opts: {remote: {customerId: string}},
): ReturnType<typeof _getPipelineStageMapping> => {
  const cached = pipelineStageMappingCache.get(opts.remote.customerId)
  if (cached) {
    console.log(
      '[hubspot] Using cached pipeline stage mapping for customerId:',
      opts.remote.customerId,
    )
    return cached
  }
  const res = await _getPipelineStageMapping(instance)
  pipelineStageMappingCache.set(opts.remote.customerId, res)
  return res
}

export type PipelineStageMapping = Awaited<
  ReturnType<typeof _getPipelineStageMapping>
>
const _getPipelineStageMapping = async (instance: HubspotSDK) => {
  const res = await instance.crm_pipelines.GET(
    '/crm/v3/pipelines/{objectType}',
    {params: {path: {objectType: 'deals'}}},
  )
  return RM.mapToObj(res.data.results, (result) => [
    result.id,
    {
      label: result.label,
      stageLabelById: RM.mapToObj(result.stages, (stage) => [
        stage.id,
        stage.label,
      ]),
    },
  ])
}

const _createObject = async <T extends 'contacts' | 'companies' | 'notes'>(
  instance: HubspotSDK,
  {
    objectType,
    ...input
  }: {
    objectType: T
    record: Record<string, unknown>
  },
) => {
  const hubspotInput = reverseMappers[`${objectType}_input`].parse(input.record)
  const res = await instance[getApiName(objectType)].POST(
    `/crm/v3/objects/${objectType as 'contacts'}/batch/create`,
    {body: {inputs: [{associations: [], ...hubspotInput}]}},
  )
  const created = res.data.results[0]
  if (!created) {
    throw new InternalServerError(`Failed to create ${objectType}`)
  }
  return {
    record: mappers[objectType].parse(created) as (typeof mappers)[T]['_out'],
  }
}
const _updateObject = async <T extends 'contacts' | 'companies'>(
  instance: HubspotSDK,
  {
    objectType,
    ...input
  }: {
    objectType: T
    id: string
    record: Record<string, unknown>
  },
) => {
  const hubspotInput = reverseMappers[`${objectType}_input`].parse(input.record)
  const res = await instance[getApiName(objectType)].POST(
    `/crm/v3/objects/${objectType as 'contacts'}/batch/update`,
    {body: {inputs: [{...hubspotInput, id: input.id}]}},
  )
  const updated = res.data.results[0]
  if (!updated) {
    throw new InternalServerError(`Failed to update ${objectType}`)
  }
  return {
    record: mappers[objectType].parse(updated) as (typeof mappers)[T]['_out'],
  }
}

const _upsertObject = async <T extends 'contacts' | 'companies'>(
  instance: HubspotSDK,
  {
    objectType,
    record,
    ...input
  }: {
    objectType: T
    record: Record<string, unknown>
    upsert_on: {key: string; values: string[]}
  },
) => {
  const {key, values} = input.upsert_on
  const records = await instance[`crm_${objectType as 'contacts'}`]
    .POST(`/crm/v3/objects/${objectType as 'contacts'}/search`, {
      body: {
        filterGroups: [
          {filters: [{propertyName: key, values, operator: 'IN'}]},
        ],
        sorts: [key],
        properties: ['id', key],
        limit: 2,
        after: '',
      },
    })
    .then((r) => r.data.results)
  if (records.length > 1) {
    throw new BadRequestError(`More than one ${objectType} found for upsert`)
  }
  const existingId = records[0]?.id
  if (!existingId) {
    return _createObject(instance, {objectType, record})
  } else {
    return _updateObject(instance, {objectType, record, id: existingId})
  }
}

const _batchReadObjectThenMap = async <TIn, TOut extends BaseRecord>(
  instance: HubspotSDK,
  {
    objectType,
    mapper,
    ...input
  }: {
    objectType: HubspotObjectTypePlural
    mapper: {parse: (rawData: unknown) => TOut; _in: TIn}
    ids: string[]
    properties: string[]
  },
) => {
  const res = await instance[getApiName(objectType)].POST(
    `/crm/v3/objects/${objectType as 'contacts'}/batch/read`,
    {
      body: {
        inputs: input.ids.map((id) => ({id})),
        properties: input.properties,
        propertiesWithHistory: [],
      },
    },
  )
  return res.data.results.map(mapper.parse)
}

export const hubspotAdapter = {
  listContacts: async ({instance, input, ctx}) =>
    input?.sync_mode === 'full'
      ? _listObjectsFullThenMap(instance, {
          objectType: 'contacts',
          mapper: mappers.contacts,
          page_size: input?.page_size,
          cursor: input?.cursor,
          fields: propertiesToFetch.contact,
          associations: associationsToFetch.contact,
        })
      : _listObjectsIncrementalThenMap(instance, {
          ...input,
          objectType: 'contacts',
          mapper: mappers.contacts,
          fields: propertiesToFetch.contact,
          includeAllFields: true,
          associations: associationsToFetch.contact,
          ctx,
        }),
  batchReadContacts: async ({instance, input}) =>
    _batchReadObjectThenMap(instance, {
      ...input,
      objectType: 'contacts',
      mapper: mappers.contacts,
    }),
  createContact: ({instance, input}) =>
    _createObject(instance, {...input, objectType: 'contacts'}),
  updateContact: ({instance, input}) =>
    _updateObject(instance, {...input, objectType: 'contacts'}),
  upsertContact: ({instance, input}) =>
    _upsertObject(instance, {...input, objectType: 'contacts'}),

  listAccounts: async ({instance, input, ctx}) =>
    input?.sync_mode === 'full'
      ? _listObjectsFullThenMap(instance, {
          objectType: 'companies',
          mapper: mappers.companies,
          page_size: input?.page_size,
          cursor: input?.cursor,
          fields: propertiesToFetch.company,
        })
      : _listObjectsIncrementalThenMap(instance, {
          ...input,
          objectType: 'companies',
          mapper: mappers.companies,
          fields: propertiesToFetch.company,
          includeAllFields: true,
          ctx,
        }),
  batchReadAccounts: async ({instance, input}) =>
    _batchReadObjectThenMap(instance, {
      ...input,
      objectType: 'companies',
      mapper: mappers.companies,
    }),
  createAccount: ({instance, input}) =>
    _createObject(instance, {...input, objectType: 'companies'}),
  updateAccount: ({instance, input}) =>
    _updateObject(instance, {...input, objectType: 'companies'}),
  upsertAccount: ({instance, input}) =>
    _upsertObject(instance, {...input, objectType: 'companies'}),

  listOpportunities: async ({instance, input, ctx}) =>
    input?.sync_mode === 'full'
      ? _listObjectsFullThenMap(instance, {
          objectType: 'deals',
          mapper: mappers.opportunities,
          page_size: input?.page_size,
          cursor: input?.cursor,
          fields: propertiesToFetch.deal,
          associations: associationsToFetch.deal,
        })
      : _listObjectsIncrementalThenMap(instance, {
          ...input,
          objectType: 'deals',
          mapper: mappers.opportunities,
          fields: propertiesToFetch.deal,
          includeAllFields: true,
          associations: associationsToFetch.deal,
          ctx,
        }),
  createNote: ({instance, input}) =>
    _createObject(instance, {...input, objectType: 'notes'}),

  listNotes: async ({instance, input, ctx}) =>
    input?.sync_mode === 'full'
      ? _listObjectsFullThenMap(instance, {
          objectType: 'notes',
          mapper: mappers.notes,
          page_size: input?.page_size,
          cursor: input?.cursor,
          fields: propertiesToFetch.note,
          associations: associationsToFetch.note,
        })
      : _listObjectsIncrementalThenMap(instance, {
          ...input,
          objectType: 'notes',
          mapper: mappers.notes,
          fields: propertiesToFetch.note,
          includeAllFields: true,
          associations: associationsToFetch.note,
          ctx,
        }),
  // Original supaglue never implemented this, TODO: handle me...
  // listLeads: async ({instance, input, ctx}) =>
  //   _listObjectsFullThenMap(instance, {
  //     ...input,
  //     objectType: 'leads',
  //     mapper: mappers.lead,
  //     fields: [],
  //   }),
  // Owners does not have a search API... so we have to do a full sync every time
  listUsers: async ({instance, input}) =>
    _listObjectsFullThenMap(instance, {
      objectType: 'owners',
      mapper: mappers.users,
      page_size: input?.page_size,
      cursor: input?.cursor,
    }),

  // MARK: - Custom objects
  listCustomObjectRecords: async ({instance, input}) =>
    _listObjectsFullThenMap(instance, {
      objectType: await getObjectTypeFromNameOrId(
        instance,
        input.object_name,
      ).then(hubspotPluralize),
      mapper: mappers.customObjects,
      page_size: input?.page_size,
      cursor: input?.cursor,
    }),

  createCustomObjectRecord: async ({instance, input}) => {
    // This may cause a runtime error as Hubspot appears to only support string prop values
    // during creation anyways
    const properties = input.record as Record<string, string>
    const objectType = await getObjectTypeFromNameOrId(
      instance,
      input.object_name,
    )
    const res = await instance.crm_objects.POST(
      '/crm/v3/objects/{objectType}',
      {params: {path: {objectType}}, body: {properties, associations: []}},
    )
    return {record: res.data}
  },

  // MARK: - Metadata endpoints

  metadataListObjects: async ({instance, input}) =>
    uniqBy(
      [
        ...(!input.type || input.type === 'standard'
          ? Object.keys(HUBSPOT_OBJECT_SINGULAR_TO_PLURAL).map((objType) => ({
              id: objType,
              name: objType,
            }))
          : []),
        ...(!input.type || input.type === 'custom'
          ? await instance.crm_schemas
              .GET('/crm/v3/schemas')
              .then((res) =>
                res.data.results.map((obj) => ({id: obj.id, name: obj.name})),
              )
          : []),
      ],
      (o) => o.id,
    ),
  metadataListObjectProperties: async ({instance, input}) => {
    const res = await instance.crm_properties.GET(
      '/crm/v3/properties/{objectType}',
      {params: {path: {objectType: input.object_name}}},
    )
    return res.data.results.map((obj) => ({
      id: obj.name,
      label: obj.label,
      type: obj.type,
      raw_details: obj,
    }))
  },

  metadataCreateObjectProperty: async ({instance, input}) => {
    const res = await instance.crm_properties.POST(
      '/crm/v3/properties/{objectType}',
      {
        params: {path: {objectType: input.object_name}},
        body: {
          groupName: '',
          fieldType: 'text',
          ...input.raw_details,
          name: input.id,
          label: input.label,
          type: input.type as 'string',
        },
      },
    )
    return {
      id: res.data.name,
      label: res.data.label,
      type: res.data.type,
      raw_details: res.data,
    }
  },

  metadataCreateObject: async ({instance, input: params}) => {
    const primaryField = params.fields.find(
      (field) => field.id === params.primary_field_id,
    )

    if (!primaryField) {
      throw new BadRequestError(
        `Could not find primary field with key name ${params.primary_field_id}`,
      )
    }

    if (primaryField.type !== 'text') {
      throw new BadRequestError(
        `Primary field must be of type text, but was ${primaryField.type} with key name ${params.primary_field_id}`,
      )
    }

    if (!primaryField.is_required) {
      throw new BadRequestError(
        `Primary field must be required, but was not with key name ${params.primary_field_id}`,
      )
    }

    const res = await instance.crm_schemas.POST('/crm/v3/schemas', {
      body: {
        name: params.name,
        labels: params.labels,
        primaryDisplayProperty: params.primary_field_id,
        properties: params.fields.map(
          (
            field,
          ): Oas_crm_schemas['components']['schemas']['ObjectTypePropertyCreate'] => ({
            name: field.id,
            label: field.label,
            ...(() => {
              switch (field.type) {
                case 'text':
                  return {type: 'string', fieldType: 'text'}
                case 'textarea':
                  return {type: 'string', fieldType: 'textarea'}
                case 'number':
                  return {type: 'number', fieldType: 'number'}
                case 'picklist':
                case 'multipicklist':
                  return {
                    type: 'enumeration',
                    fieldType:
                      field.type === 'picklist' ? 'select' : 'checkbox',
                    options: field.options?.map((option, idx) => ({
                      label: option.label,
                      value: option.value,
                      description: option.description,
                      hidden: option.hidden ?? false,
                      displayOrder: idx + 1,
                    })),
                  }
                case 'date':
                  return {type: 'date', fieldType: 'date'}
                case 'datetime':
                  return {type: 'datetime', fieldType: 'date'}
                case 'boolean':
                  return {
                    type: 'bool',
                    fieldType: 'booleancheckbox',
                    options: [
                      {
                        label: 'Yes',
                        value: 'true',
                        displayOrder: 1,
                        hidden: false,
                      },
                      {
                        label: 'No',
                        value: 'false',
                        displayOrder: 2,
                        hidden: false,
                      },
                    ],
                  }
                case 'url':
                  throw new BadRequestError('url type is unsupported')
                default:
                  return {type: 'string', fieldType: 'text'}
              }
            })(),
          }),
        ),
        requiredProperties: params.fields
          .filter((field) => field.is_required)
          .map((field) => field.id),
        searchableProperties: [],
        secondaryDisplayProperties: [],
        associatedObjects: [],
      },
    })
    return {id: res.data.id, name: res.data.name}
  },
  metadataCreateAssociation: async ({instance, input}) => {
    const [fromObjectType, toObjectType] = await Promise.all([
      getObjectTypeFromNameOrId(instance, input.source_object),
      getObjectTypeFromNameOrId(instance, input.target_object),
    ])

    // Would be great to have a way to annotate sdk-hubspot that crm_crm_associations corresponds to the v4 associations API
    // while crm_associations corresponds to the v3 associations API
    // The path is also super misleading here as it includes `labels`. but it corresponds to `hubspot.crm.associations.v4.schema.definitionsApi.create`
    await instance.crm_crm_associations.POST(
      '/{fromObjectType}/{toObjectType}/labels',
      {
        params: {path: {fromObjectType, toObjectType}},
        body: {label: input.display_name, name: input.suggested_key_name},
      },
    )
    // > tony: It's not super clear to me why we need a separate GET request and then filter by label
    // however this is what Supaglue did so keeping it for now
    const res = await instance.crm_crm_associations.GET(
      '/{fromObjectType}/{toObjectType}/labels',
      {params: {path: {fromObjectType, toObjectType}}},
    )

    const created = res.data.results.find(
      (result) => result.label === input.display_name,
    )
    if (!created) {
      throw new InternalServerError('Unable to create association schema')
    }

    return {
      association_schema: {
        id: created.typeId.toString(),
        target_object: toObjectType,
        source_object: fromObjectType,
        display_name: input.display_name,
      },
    }
  },
} satisfies CRMAdapter<HubspotSDK>
