import oas from '@opensdks/sdk-pipedrive/pipedrive.oas.json'
import type {ConnectorDef, ConnectorSchemas, OpenApiSpec} from '@openint/cdk'
import {connHelpers, oauthBaseSchema} from '@openint/cdk'
import {z} from '@openint/util'

export const zConfig = oauthBaseSchema.connectorConfig

const oReso = oauthBaseSchema.resourceSettings
export const zSettings = oReso.extend({
  oauth: oReso.shape.oauth,
})

export const pipedriveSchemas = {
  name: z.literal('pipedrive'),
  connectorConfig: zConfig,
  resourceSettings: zSettings,
  connectOutput: oauthBaseSchema.connectOutput,
} satisfies ConnectorSchemas

export const pipedriveHelpers = connHelpers(pipedriveSchemas)

export const pipedriveDef = {
  name: 'pipedrive',
  schemas: pipedriveSchemas,
  metadata: {
    displayName: 'Outreach',
    stage: 'beta',
    verticals: ['crm'],
    logoUrl: '/_assets/logo-pipedrive.svg',
    nangoProvider: 'pipedrive',
    openapiSpec: {proxied: oas as unknown as OpenApiSpec},
  },
} satisfies ConnectorDef<typeof pipedriveSchemas>

export default pipedriveDef
