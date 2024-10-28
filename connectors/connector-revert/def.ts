import type {RevertSDKTypes} from '@opensdks/sdk-revert'
import revertOas from '@opensdks/sdk-revert/revert.oas.json'
import type {ConnectorDef, ConnectorSchemas, OpenApiSpec} from '@openint/cdk'
import {connHelpers} from '@openint/cdk'
import {z, zCast} from '@openint/util'

type components = RevertSDKTypes['oas']['components']

export const revertSchemas = {
  name: z.literal('revert'),
  connectorConfig: z.object({
    api_token: z.string().describe('Revert API token'),
    api_version: z.string().optional().describe('Revert API version'),
  }),
  resourceSettings: z.object({
    tenant_id: z
      .string()
      .describe(
        "x-revert-t-id header. This is the end user, aka Revert's customer's customer",
      ),
  }),
  sourceOutputEntities: {
    company: zCast<components['schemas']['commonCompany']>(),
    contact: zCast<components['schemas']['commonContact']>(),
    deal: zCast<components['schemas']['commonDeal']>(),
  },
} satisfies ConnectorSchemas

export const helpers = connHelpers(revertSchemas)

export const revertDef = {
  metadata: {
    verticals: ['crm'],
    logoUrl: '/_assets/logo-revert.png',
    stage: 'beta',
    openapiSpec: {
      proxied: revertOas as OpenApiSpec,
    },
  },
  name: 'revert',
  schemas: revertSchemas,
} satisfies ConnectorDef<typeof revertSchemas>

export default revertDef
