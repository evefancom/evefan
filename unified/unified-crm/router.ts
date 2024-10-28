import type {AdapterFromRouter, RouterMeta} from '@openint/vdk'
import {
  proxyCallAdapter,
  trpc,
  verticalProcedure,
  withWarnings,
  z,
  zPaginatedResult,
  zPaginationParams,
} from '@openint/vdk'
import adapters from './adapters'
import * as unified from './unifiedModels'

export {unified}

function oapi(meta: NonNullable<RouterMeta['openapi']>): RouterMeta {
  return {openapi: {...meta, path: `/unified/crm${meta.path}`}}
}

const procedure = verticalProcedure(adapters)

export const crmRouter = trpc.router({
  countEntity: procedure
    .meta(oapi({method: 'GET', path: '/{entity}/_count'}))
    .input(z.object({entity: z.string()}))
    .output(z.object({count: z.number()}))
    .query(async ({input, ctx}) => proxyCallAdapter({input, ctx})),
  // MARK: - Account
  listAccounts: procedure
    .meta(oapi({method: 'GET', path: '/account'}))
    .input(zPaginationParams.nullish())
    .output(zPaginatedResult.extend({items: z.array(unified.account)}))
    .query(async ({input, ctx}) => proxyCallAdapter({input, ctx})),
  getAccount: procedure
    .meta(oapi({method: 'GET', path: '/account/{id}'}))
    .input(z.object({id: z.string()}))
    .output(z.object({record: unified.account, raw: z.unknown()}))
    .query(async ({input, ctx}) => proxyCallAdapter({input, ctx})),

  batchReadAccounts: procedure
    .meta(oapi({method: 'POST', path: '/account/_batch_read'}))
    .input(
      z.object({ids: z.array(z.string()), properties: z.array(z.string())}),
    )
    .output(z.array(unified.account))
    .mutation(async ({input, ctx}) => proxyCallAdapter({input, ctx})),

  createAccount: procedure
    .meta(oapi({method: 'POST', path: '/account'}))
    .input(z.object({record: unified.account_input}))
    .output(z.object({record: unified.account}))
    .mutation(async ({input, ctx}) => proxyCallAdapter({input, ctx})),

  updateAccount: procedure
    .meta(oapi({method: 'PATCH', path: '/account/{id}'}))
    .input(z.object({id: z.string(), record: unified.account_input}))
    .output(z.object({record: unified.account}))
    .mutation(async ({input, ctx}) => proxyCallAdapter({input, ctx})),

  upsertAccount: procedure
    .meta(oapi({method: 'POST', path: '/account/_upsert'}))
    .input(
      z.object({
        upsert_on: z.object({
          key: z
            .enum(['domain', 'website'])
            .describe(
              'The key to upsert on. Only `website` is supported for Salesforce, while both `domain` and `website` are supported for Hubspot.',
            ),
          values: z
            .array(z.string())
            .describe(
              'The values to upsert on. If more than one value is provided, it will act as a logical OR. If more than one account is found that matches, then an error will be thrown.',
            ),
        }),
        record: unified.account_input,
      }),
    )
    .output(z.object({record: unified.account}))
    .mutation(async ({input, ctx}) => proxyCallAdapter({input, ctx})),
  // MARK: - Contact
  listContacts: procedure
    .meta(oapi({method: 'GET', path: '/contact'}))
    .input(zPaginationParams.nullish())
    .output(zPaginatedResult.extend({items: z.array(unified.contact)}))
    .query(async ({input, ctx}) => proxyCallAdapter({input, ctx})),
  getContact: procedure
    .meta(oapi({method: 'GET', path: '/contact/{id}'}))
    .input(z.object({id: z.string()}))
    .output(z.object({record: unified.contact, raw: z.unknown()}))
    .query(async ({input, ctx}) => proxyCallAdapter({input, ctx})),

  batchReadContacts: procedure
    .meta(oapi({method: 'POST', path: '/contact/_batch_read'}))
    .input(
      z.object({ids: z.array(z.string()), properties: z.array(z.string())}),
    )
    .output(z.array(unified.contact))
    .mutation(async ({input, ctx}) => proxyCallAdapter({input, ctx})),
  createContact: procedure
    .meta(oapi({method: 'POST', path: '/contact'}))
    .input(z.object({record: unified.contact_input}))
    .output(z.object({record: unified.contact}))
    .mutation(async ({input, ctx}) => proxyCallAdapter({input, ctx})),

  updateContact: procedure
    .meta(oapi({method: 'PATCH', path: '/contact/{id}'}))
    .input(z.object({id: z.string(), record: unified.contact_input}))
    .output(z.object({record: unified.contact}))
    .mutation(async ({input, ctx}) => proxyCallAdapter({input, ctx})),
  upsertContact: procedure
    .meta(oapi({method: 'POST', path: '/contact/_upsert'}))
    .input(
      z.object({
        upsert_on: z.object({
          key: z
            .enum(['email'])
            .describe(
              'The key to upsert on. Only `email` is supported for all providers.',
            ),
          values: z
            .array(z.string())
            .describe(
              'The values to upsert on. If more than one value is provided, it will act as a logical OR. If more than one record is found that matches, then an error will be thrown.',
            ),
        }),
        record: unified.contact_input,
      }),
    )
    .output(z.object({record: unified.contact}))
    .mutation(async ({input, ctx}) => proxyCallAdapter({input, ctx})),
  // MARK: - Lead
  listLeads: procedure
    .meta(oapi({method: 'GET', path: '/lead'}))
    .input(zPaginationParams.nullish())
    .output(zPaginatedResult.extend({items: z.array(unified.lead)}))
    .query(async ({input, ctx}) => proxyCallAdapter({input, ctx})),
  getLead: procedure
    .meta(oapi({method: 'GET', path: '/lead/{id}'}))
    .input(z.object({id: z.string()}))
    .output(z.object({record: unified.lead, raw: z.unknown()}))
    .query(async ({input, ctx}) => proxyCallAdapter({input, ctx})),

  // MARK: - Opportunity
  listOpportunities: procedure
    .meta(oapi({method: 'GET', path: '/opportunity'}))
    .input(zPaginationParams.nullish())
    .output(zPaginatedResult.extend({items: z.array(unified.opportunity)}))
    .query(async ({input, ctx}) => proxyCallAdapter({input, ctx})),
  getOpportunity: procedure
    .meta(oapi({method: 'GET', path: '/opportunity/{id}'}))
    .input(z.object({id: z.string()}))
    .output(z.object({record: unified.opportunity, raw: z.unknown()}))
    .query(async ({input, ctx}) => proxyCallAdapter({input, ctx})),

  // MARK: - Notes

  listNotes: procedure
    .meta(oapi({method: 'GET', path: '/note'}))
    .input(zPaginationParams.nullish())
    .output(zPaginatedResult.extend({items: z.array(unified.note)}))
    .query(async ({input, ctx}) => proxyCallAdapter({input, ctx})),

  createNote: procedure
    .meta(oapi({method: 'POST', path: '/note'}))
    .input(z.object({record: unified.note_input}))
    .output(z.object({record: unified.note}))
    .mutation(async ({input, ctx}) => proxyCallAdapter({input, ctx})),

  // MARK: - User
  listUsers: procedure
    .meta(oapi({method: 'GET', path: '/user'}))
    .input(zPaginationParams.nullish())
    .output(zPaginatedResult.extend({items: z.array(unified.user)}))
    .query(async ({input, ctx}) => proxyCallAdapter({input, ctx})),
  getUser: procedure
    .meta(oapi({method: 'GET', path: '/user/{id}'}))
    .input(z.object({id: z.string()}))
    .output(z.object({record: unified.user, raw: z.unknown()}))
    .query(async ({input, ctx}) => proxyCallAdapter({input, ctx})),

  // MARK: - Custom objects
  listCustomObjectRecords: procedure
    .meta(oapi({method: 'GET', path: '/custom_objects/{object_name}'}))
    .input(
      z.object({
        object_name: z.string(),
        ...zPaginationParams.shape,
      }),
    )
    .output(zPaginatedResult.extend({items: z.array(z.unknown())}))
    .query(async ({input, ctx}) => proxyCallAdapter({input, ctx})),

  createCustomObjectRecord: procedure
    .meta(oapi({method: 'POST', path: '/custom_objects/{object_name}'}))
    .input(
      z.object({
        object_name: z.string(),
        record: z.record(z.unknown()),
      }),
    )
    .output(withWarnings({record: z.unknown()}))
    .query(async ({input, ctx}) => proxyCallAdapter({input, ctx})),

  // MARK: - Metadata
  metadataListObjects: procedure
    .meta(oapi({method: 'GET', path: '/metadata/objects'}))
    .input(z.object({type: z.enum(['standard', 'custom']).optional()}))
    .output(z.array(unified.meta_object))
    .query(async ({input, ctx}) => proxyCallAdapter({input, ctx})),

  metadataCreateObject: procedure
    .meta(
      oapi({
        method: 'POST',
        path: '/metadata/objects',
        // There is no need to add `custom` to path here.
        // Whenever we are creating a new object, it is always custom.
        // Otherwise we'd have to say create_custom_assocations also
        description: 'Create custom object schema',
      }),
    )
    .input(
      z.object({
        name: z.string(),
        description: z.string().nullable(),
        labels: z.object({
          singular: z.string(),
          plural: z.string(),
        }),
        primary_field_id: z.string(),
        fields: z.array(unified.meta_custom_object_field).min(1),
      }),
    )
    // Maybe this should output meta_object_schema instead?
    .output(unified.meta_object)
    .query(async ({input, ctx}) => proxyCallAdapter({input, ctx})),

  metadataListObjectProperties: procedure
    .meta(
      oapi({method: 'GET', path: '/metadata/objects/{object_name}/properties'}),
    )
    // type: z.enum(['standard', 'custom']), // Does not seem to be needed
    .input(z.object({object_name: z.string()}))
    .output(z.array(unified.meta_property))
    .query(async ({input, ctx}) => proxyCallAdapter({input, ctx})),

  metadataCreateObjectProperty: procedure
    .meta(
      oapi({
        method: 'POST',
        path: '/metadata/objects/{object_name}/properties',
      }),
    )
    .input(z.object({object_name: z.string()}).merge(unified.meta_property))
    .output(unified.meta_property)
    .mutation(async ({input, ctx}) => proxyCallAdapter({input, ctx})),

  metadataCreateAssociation: procedure
    .meta(oapi({method: 'POST', path: '/metadata/associations'}))
    .input(
      z.object({
        source_object: z.string(),
        target_object: z.string(),
        suggested_key_name: z
          .string()
          .describe(
            'The underlying provider may change this (e.g. adding `__c` for Salesforce).',
          ),
        display_name: z.string(),
      }),
    )
    .output(withWarnings({association_schema: unified.meta_association_schema}))
    .query(async ({input, ctx}) => proxyCallAdapter({input, ctx})),
  // Update custom object schema didn't work within Supaglue anyways...
})

export type CRMAdapter<TInstance> = AdapterFromRouter<
  typeof crmRouter,
  TInstance
>
