import type {
  ConnectorDef,
  ConnectorSchemas,
  EntityPayloadWithRaw,
} from '@openint/cdk'
import {connHelpers} from '@openint/cdk'
import {z, zCast} from '@openint/util'
import {zAirtableResourceSettings} from './AirtableClient'

export const airtableSchemas = {
  name: z.literal('airtable'),
  resourceSettings: zAirtableResourceSettings,
  destinationInputEntity: zCast<EntityPayloadWithRaw>(),
} satisfies ConnectorSchemas

export const helpers = connHelpers(airtableSchemas)

export const airtableDef = {
  metadata: {
    verticals: ['database'],
    logoUrl: '/_assets/logo-airtable.svg',
  },
  name: 'airtable',
  schemas: airtableSchemas,
} satisfies ConnectorDef<typeof airtableSchemas>

export default airtableDef
