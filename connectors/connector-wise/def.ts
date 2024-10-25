import type {ConnectorDef, ConnectorSchemas} from '@openint/cdk'
import {connHelpers, makePostingsMap} from '@openint/cdk'
import {A, z} from '@openint/util'
import {
  profileResponseItemSchema,
  transferResponseItemSchema,
  zEnvName,
} from './WiseClient'

export const wiseSchemas = {
  name: z.literal('wise'),
  // connectorConfig: zWiseConfig,
  resourceSettings: z.object({
    envName: zEnvName,
    apiToken: z.string().nullish(),
  }),
  connectInput: z.object({
    redirectUri: z.string(),
    clientId: z.string(),
    envName: zEnvName,
  }),
  connectOutput: z.object({
    envName: zEnvName,
    apiToken: z.string().nullish(),
  }),
  sourceOutputEntity: z.discriminatedUnion('entityName', [
    z.object({
      id: z.string(),
      entityName: z.literal('account'),
      entity: profileResponseItemSchema,
    }),
    z.object({
      id: z.string(),
      entityName: z.literal('transaction'),
      entity: transferResponseItemSchema,
    }),
  ]),
} satisfies ConnectorSchemas

export const wiseHelpers = connHelpers(wiseSchemas)

export const wiseDef = {
  name: 'wise',
  schemas: wiseSchemas,
  metadata: {verticals: ['banking'], logoUrl: '/_assets/logo-wise.png'},
  standardMappers: {
    entity: (data) => {
      if (data.entityName === 'account') {
        const a = data.entity
        return {
          id: `${a.id}`,
          entityName: 'account',
          entity: {
            name: `${data.entity.details.firstName} ${data.entity.details.lastName}`,
            type: 'expense',
          },
        }
      } else if (data.entityName === 'transaction') {
        const t = data.entity

        return {
          id: `${t.id}`,
          entityName: 'transaction',
          entity: {
            date: t.created,
            description: t.details.reference ?? '',
            postingsMap: makePostingsMap({
              main: {
                accountExternalId: (data.entity.quoteUuid ?? '') as ExternalId,
                amount: A(
                  data.entity.sourceValue ?? 0,
                  (data.entity.sourceCurrency ?? 'USD') as Unit,
                ),
              },
            }),
          },
        }
      }
      return null
    },
  },
} satisfies ConnectorDef<typeof wiseSchemas>

export default wiseDef
