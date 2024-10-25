import type {ConnectorDef, ConnectorSchemas, Pta} from '@openint/cdk'
import {connHelpers, makePostingsMap} from '@openint/cdk'
import {A, R, z} from '@openint/util'
import {itemProjectResponseSchema, itemTimeEntriesSchema} from './TogglCient'

export const togglSchemas = {
  name: z.literal('toggl'),
  // connectorConfig: zTogglConfig,
  connectInput: z.object({
    apiToken: z.string(),
  }),
  connectOutput: z.object({
    apiToken: z.string(),
    email: z.string().nullish(),
    password: z.string().nullish(),
  }),
  resourceSettings: z.object({
    apiToken: z.string(),
    email: z.string().nullish(),
    password: z.string().nullish(),
  }),
  sourceOutputEntity: z.discriminatedUnion('entityName', [
    z.object({
      id: z.string(),
      entityName: z.literal('account'),
      entity: itemProjectResponseSchema,
    }),
    z.object({
      id: z.string(),
      entityName: z.literal('transaction'),
      entity: itemTimeEntriesSchema,
    }),
  ]),
} satisfies ConnectorSchemas

export const togglHelpers = connHelpers(togglSchemas)

export const togglDef = {
  name: 'toggl',
  metadata: {
    logoUrl: '/_assets/logo-toggl.svg',
  },
  schemas: togglSchemas,
  standardMappers: {
    entity: (data) => {
      if (data.entityName === 'account') {
        const a = data.entity
        return {
          id: `${a.id}`,
          entityName: 'account',
          entity: R.identity<Pta.Account>({
            name: data.entity.name ?? '',
            type: 'expense',
          }),
        }
      } else if (data.entityName === 'transaction') {
        const t = data.entity
        return {
          id: `${t.id}`,
          entityName: 'transaction',
          entity: R.identity<Pta.Transaction>({
            date: data.entity.at ?? '',
            description: data.entity.description ?? '',
            postingsMap: makePostingsMap({
              main: {
                accountExternalId: `${data.entity.workspace_id}` as ExternalId,
                amount: A(data.entity.duration ?? 0, 'Second' as Unit),
              },
            }),
          }),
        }
      }
      return null
    },
  },
} satisfies ConnectorDef<typeof togglSchemas>

export default togglDef
