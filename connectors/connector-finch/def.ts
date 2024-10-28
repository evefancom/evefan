import type {FinchSDKTypes} from '@opensdks/sdk-finch'
import finchOas from '@opensdks/sdk-finch/finch.oas.json'
import type {ConnectorDef, ConnectorSchemas, OpenApiSpec} from '@openint/cdk'
import {connHelpers} from '@openint/cdk'
import {z, zCast} from '@openint/util'

type components = FinchSDKTypes['oas']['components']

const zProduct = z.enum([
  'company',
  'directory',
  'individual',
  'ssn',
  'employment',
  'payment',
  'pay_statement',
  'benefits',
])

export const finchSchemas = {
  name: z.literal('finch'),
  // Auth
  connectorConfig: z.object({
    client_id: z.string(),
    client_secret: z.string(),
    api_version: z.string().optional().describe('Finch API version'),
    products: z
      .array(zProduct)
      .describe(
        'Finch products to access, @see https://developer.tryfinch.com/api-reference/development-guides/Permissions',
      ),
  }),
  resourceSettings: z.object({
    access_token: z.string(),
  }),

  // Connect
  preConnectInput: z.object({
    // categories: z.array(zCategory),
    // end_user_email_address: z.string().optional(),
    // end_user_organization_name: z.string().optional(),
    state: z.string().optional(),
  }),
  connectInput: z.object({
    client_id: z.string(),
    products: z.array(zProduct),
  }),
  connectOutput: z.object({
    state: z.string().optional(),
    code: z.string(),
  }),
  //
  sourceOutputEntities: {
    company: zCast<components['schemas']['Company']>(),
    // contact: zCast<components['schemas']['commonContact']>(),
    // deal: zCast<components['schemas']['commonDeal']>(),
  },
} satisfies ConnectorSchemas

export const helpers = connHelpers(finchSchemas)

export const finchDef = {
  metadata: {
    verticals: ['payroll'],
    logoUrl: '/_assets/logo-finch.svg',
    stage: 'beta',
    // TODO: Make the openAPI spec dynamic.. It can be many megabytes per connector
    // among other things...
    openapiSpec: {
      proxied: finchOas as OpenApiSpec,
    },
  },
  name: 'finch',
  schemas: finchSchemas,
} satisfies ConnectorDef<typeof finchSchemas>

export default finchDef
