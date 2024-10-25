import type {HeronSDKTypes} from '@opensdks/sdk-heron'
import type {ConnectorDef, ConnectorSchemas, EntityPayload} from '@openint/cdk'
import {connHelpers} from '@openint/cdk'
import {z, zCast} from '@openint/util'

type components = HeronSDKTypes['oas']['components']

export const heronSchemas = {
  name: z.literal('heron'),
  connectorConfig: z.object({apiKey: z.string()}),
  // is endUserId actually needed here?
  // How do we create default resources for integrations that are basically single resource?
  destinationInputEntity: zCast<EntityPayload>(),
  sourceOutputEntity: z.object({
    id: z.string(),
    entityName: z.literal('transaction'),
    entity: zCast<components['schemas']['TransactionEnriched']>(),
  }),
} satisfies ConnectorSchemas

export const helpers = connHelpers(heronSchemas)

export const heronDef = {
  schemas: heronSchemas,
  name: 'heron',
  metadata: {
    displayName: 'Heron Data',
    stage: 'beta',
    verticals: ['enrichment'],
    // This reaches into the next.js public folder which is technically outside the integration directory itself.
    // Low priority to figure out how to have the svg assets be self-contained also
    // also we may need mdx support for the description etc.
    logoUrl: '/_assets/logo-heron.png',
  },

  standardMappers: {
    resource() {
      return {
        displayName: 'Heron',
        // status: healthy vs. disconnected...
        // labels: test vs. production
      }
    },
    entity: {
      transaction: (entity) => ({
        id: entity.id,
        entityName: 'transaction',
        entity: {
          date: entity.entity.date ?? '',
          description: entity.entity.description ?? '',
        },
      }),
    },
  },
} satisfies ConnectorDef<typeof heronSchemas>

export default heronDef
