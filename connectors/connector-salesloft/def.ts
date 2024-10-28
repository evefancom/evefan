import oas from '@opensdks/sdk-salesloft/salesloft.oas.json'
import type {ConnectorDef, ConnectorSchemas, OpenApiSpec} from '@openint/cdk'
import {connHelpers, oauthBaseSchema} from '@openint/cdk'
import {z} from '@openint/util'

export const zConfig = oauthBaseSchema.connectorConfig

const oReso = oauthBaseSchema.resourceSettings
export const zSettings = oReso.extend({
  oauth: oReso.shape.oauth,
})

export const salesloftSchemas = {
  name: z.literal('salesloft'),
  connectorConfig: zConfig,
  resourceSettings: zSettings,
  connectOutput: oauthBaseSchema.connectOutput,
} satisfies ConnectorSchemas

export const salesloftHelpers = connHelpers(salesloftSchemas)

export const salesloftDef = {
  name: 'salesloft',
  schemas: salesloftSchemas,
  metadata: {
    displayName: 'Salesloft',
    stage: 'beta',
    verticals: ['sales-engagement'],
    logoUrl: '/_assets/logo-salesloft.svg',
    nangoProvider: 'salesloft',
    openapiSpec: {proxied: oas as unknown as OpenApiSpec},
  },
} satisfies ConnectorDef<typeof salesloftSchemas>

export default salesloftDef
