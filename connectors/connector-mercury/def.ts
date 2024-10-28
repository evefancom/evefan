/**
 * For documentation, @see https://docs.mercury.com/reference/accounts
 * https://share.cleanshot.com/QjmQTFf9
 */
import type {ConnectorDef, ConnectorSchemas} from '@openint/cdk'
import {connHelpers, zCcfgAuth} from '@openint/cdk'
import {z} from '@openint/util'

export const mercurySchemas = {
  name: z.literal('mercury'),
  connectorConfig: zCcfgAuth.oauthOrApikeyAuth,
} satisfies ConnectorSchemas

export const mercuryDef = {
  schemas: mercurySchemas,
  name: 'mercury',
  metadata: {
    verticals: ['banking'],
    logoUrl: '/_assets/logo-mercury.png',
    stage: 'alpha',
  },
  standardMappers: {
    integration: () => ({
      name: 'Mercury',
      logoUrl: 'TODO: Default to integration metadata logoUrl',
      verticals: ['banking'],
    }),
    resource() {
      return {
        displayName: '',
        // status: healthy vs. disconnected...
        // labels: test vs. production
      }
    },
  },
} satisfies ConnectorDef<typeof mercurySchemas>

export const helpers = connHelpers(mercurySchemas)

export default mercuryDef
