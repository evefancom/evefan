import type {ConnectorDef, ConnectorSchemas} from '@openint/cdk'
import {connHelpers, oauthBaseSchema} from '@openint/cdk'
import {z} from '@openint/util'

export const zConfig = oauthBaseSchema.connectorConfig

const oReso = oauthBaseSchema.resourceSettings
export const zSettings = oReso.extend({
  oauth: oReso.shape.oauth,
  extra: z.unknown(),
})

export const hubspotSchemas = {
  name: z.literal('hubspot'),
  connectorConfig: zConfig,
  // TODO: Replace nango with our own oauth handling to support platform credentials via env vars easily
  // z.object({
  //   oauth: z.union([
  //     z.null().openapi({title: 'Use OpenInt platform credentials'}),
  //     zConfig.shape.oauth.openapi({title: 'Use my own'}),
  //   ]),
  // }),
  resourceSettings: zSettings,
  connectOutput: oauthBaseSchema.connectOutput,
} satisfies ConnectorSchemas

export const hubspotHelpers = connHelpers(hubspotSchemas)

export const hubspotDef = {
  name: 'hubspot',
  schemas: hubspotSchemas,
  metadata: {
    displayName: 'hubspot',
    stage: 'beta',
    verticals: ['crm'],
    logoUrl: '/_assets/logo-hubspot.svg',
    nangoProvider: 'hubspot',
  },
} satisfies ConnectorDef<typeof hubspotSchemas>

export default hubspotDef
