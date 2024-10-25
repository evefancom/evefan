import type {Oas_transactions} from '@opensdks/sdk-brex'
import type {ConnectorDef, ConnectorSchemas} from '@openint/cdk'
import {connHelpers, zCcfgAuth} from '@openint/cdk'
import {z, zCast} from '@openint/util'

type components = Oas_transactions['components']

export const brexSchemas = {
  name: z.literal('brex'),
  connectorConfig: zCcfgAuth.oauthOrApikeyAuth,
  integrationData: z.unknown(),
  resourceSettings: z.object({
    accessToken: z.string(),
  }),
  sourceOutputEntity: z.discriminatedUnion('entityName', [
    z.object({
      id: z.string(),
      entityName: z.literal('account'),
      entity: zCast<
        | components['schemas']['CardAccount']
        | components['schemas']['CashAccount']
      >(),
    }),
    z.object({
      id: z.string(),
      entityName: z.literal('transaction'),
      entity: zCast<
        | components['schemas']['CardTransaction']
        | components['schemas']['CashTransaction']
      >(),
    }),
  ]),
} satisfies ConnectorSchemas

export const brexDef = {
  schemas: brexSchemas,
  name: 'brex',
  metadata: {
    verticals: [
      'banking',
      // Add back expense management category once we actually support it properly
      // 'expense-management'
    ],
    logoUrl: '/_assets/logo-brex.png',
    stage: 'beta',
  },
  standardMappers: {
    integration: () => ({
      name: 'Brex',
      logoUrl: 'Add brex logo...',
      envName: undefined,
      verticals: ['banking'],
    }),
    resource() {
      return {
        displayName: '',
        // status: healthy vs. disconnected...
        // labels: test vs. production
      }
    },
    entity: {
      account: (entity) => ({
        id: entity.id,
        entityName: 'account',
        entity: {
          name: 'name' in entity.entity ? entity.entity.name : 'Brex Card',
        },
      }),
      // transaction: (entity) => ({
      //   id: entity.id,
      //   entityName: 'transaction',
      //   entity: {date: entity.entity.transaction_date},
      // }),
    },
  },
} satisfies ConnectorDef<typeof brexSchemas>

export const helpers = connHelpers(brexSchemas)

export default brexDef
