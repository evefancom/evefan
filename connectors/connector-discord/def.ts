import type {ConnectorDef, ConnectorSchemas} from '@openint/cdk'
import {connHelpers, oauthBaseSchema} from '@openint/cdk'
import {z} from '@openint/util'

export const discordSchemas = {
  name: z.literal('discord'),
  connectorConfig: oauthBaseSchema.connectorConfig,
  resourceSettings: oauthBaseSchema.resourceSettings,
  connectOutput: oauthBaseSchema.connectOutput,
} satisfies ConnectorSchemas

export const discordHelpers = connHelpers(discordSchemas)

export const discordDef = {
  name: 'discord',
  schemas: discordSchemas,
  metadata: {
    displayName: 'Discord',
    stage: 'beta',
    logoUrl: '/_assets/logo-discord.svg',
    nangoProvider: 'discord',
  },
} satisfies ConnectorDef<typeof discordSchemas>

export default discordDef
