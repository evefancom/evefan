import type {ConnectorDef, ConnectorSchemas} from '@openint/cdk'
import {connHelpers, oauthBaseSchema} from '@openint/cdk'
import {z} from '@openint/util'

export const zConfig = oauthBaseSchema.connectorConfig

const oReso = oauthBaseSchema.resourceSettings
export const zSettings = oReso.extend({
  oauth: oReso.shape.oauth,
})

export const googleSchemas = {
  name: z.literal('google'),
  connectorConfig: z.object({
    oauth: z
      .union([
        // TODO: This should be z.literal('default') but it does not render well in the UI :/
        z.null().openapi({title: 'Use OpenInt platform credentials'}),
        z
          .object({
            client_id: z.string(),
            client_secret: z.string(),
            scopes: z.string().describe('comma seperated scopes'),
          })
          .openapi({title: 'Use my own'}),
      ])
      .optional(),
  }),
  resourceSettings: zSettings,
  connectOutput: oauthBaseSchema.connectOutput,
} satisfies ConnectorSchemas

export const googleHelpers = connHelpers(googleSchemas)

export const googleDef = {
  name: 'google',
  schemas: googleSchemas,
  metadata: {
    displayName: 'google',
    stage: 'beta',
    verticals: ['file-storage', 'calendar'],
    logoUrl: '/_assets/logo-google.svg',
    nangoProvider: 'google',
  },
} satisfies ConnectorDef<typeof googleSchemas>

export default googleDef
