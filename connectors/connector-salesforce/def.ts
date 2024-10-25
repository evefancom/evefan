import oas from '@opensdks/sdk-salesforce/salesforce.oas.json'
import type {ConnectorDef, ConnectorSchemas, OpenApiSpec} from '@openint/cdk'
import {connHelpers, oauthBaseSchema} from '@openint/cdk'
import {z} from '@openint/util'

export const zConfig = oauthBaseSchema.connectorConfig

const oReso = oauthBaseSchema.resourceSettings
export const zSettings = oReso.extend({
  oauth: oReso.shape.oauth,
})

export const salesforceSchemas = {
  name: z.literal('salesforce'),
  connectorConfig: zConfig,
  resourceSettings: zSettings,
  connectOutput: oauthBaseSchema.connectOutput,
} satisfies ConnectorSchemas

export const salesforceHelpers = connHelpers(salesforceSchemas)

export const salesforceDef = {
  name: 'salesforce',
  schemas: salesforceSchemas,
  metadata: {
    displayName: 'salesforce',
    stage: 'beta',
    verticals: ['crm'],
    logoUrl: '/_assets/logo-salesforce.svg',
    nangoProvider: 'salesforce',
    openapiSpec: {proxied: oas as unknown as OpenApiSpec},
  },
} satisfies ConnectorDef<typeof salesforceSchemas>

export default salesforceDef
