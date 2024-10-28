import leverOas from '@opensdks/sdk-lever/lever.oas.json'
import type {ConnectorDef, ConnectorSchemas, OpenApiSpec} from '@openint/cdk'
import {connHelpers, oauthBaseSchema} from '@openint/cdk'
import {R, z} from '@openint/util'

export const zConfig = oauthBaseSchema.connectorConfig.extend({
  envName: z.enum(['sandbox', 'production']),
})

const LEVER_ENTITY_NAMES = ['posting', 'opportunity', 'offer'] as const

/**
 * Full list of OAuth scopes: https://hire.lever.co/developer/documentation#scopes
 */
const oReso = oauthBaseSchema.resourceSettings
export const zSettings = oReso.extend({
  oauth: oReso.shape.oauth,
})

export const leverSchemas = {
  name: z.literal('lever'),
  connectorConfig: zConfig,
  resourceSettings: zSettings,
  connectOutput: oauthBaseSchema.connectOutput,
  sourceOutputEntities: R.mapToObj(LEVER_ENTITY_NAMES, (e) => [
    e,
    z.unknown(),
  ]),
} satisfies ConnectorSchemas

export const leverHelpers = connHelpers(leverSchemas)

export const leverDef = {
  name: 'lever',
  schemas: leverSchemas,
  metadata: {
    displayName: 'Lever',
    stage: 'beta',
    verticals: ['ats'],
    logoUrl: '/_assets/logo-lever.svg',
    nangoProvider: 'lever-sandbox', // TODO: make this support production!
    openapiSpec: {proxied: leverOas as unknown as OpenApiSpec},
  },
} satisfies ConnectorDef<typeof leverSchemas>

export default leverDef
