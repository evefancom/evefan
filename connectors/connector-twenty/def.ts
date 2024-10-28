import type {
  ConnectorDef,
  ConnectorSchemas,
  EntityPayloadWithRaw,
} from '@openint/cdk'
import {connHelpers} from '@openint/cdk'
import {z, zCast} from '@openint/util'

export const twentySchemas = {
  name: z.literal('twenty'),
  resourceSettings: z.object({
    access_token: z.string(),
  }),
  destinationInputEntity: zCast<EntityPayloadWithRaw>(),
} satisfies ConnectorSchemas

export const helpers = connHelpers(twentySchemas)

export const twentyDef = {
  metadata: {
    verticals: ['crm'],
    logoUrl: '/_assets/logo-twenty.svg',
    stage: 'beta',
  },
  name: 'twenty',
  schemas: twentySchemas,
} satisfies ConnectorDef<typeof twentySchemas>

export default twentyDef
