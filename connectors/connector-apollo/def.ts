import oas from '@opensdks/sdk-apollo/apollo.oas.json'
import type {ConnectorDef, ConnectorSchemas, OpenApiSpec} from '@openint/cdk'
import {connHelpers, oauthBaseSchema} from '@openint/cdk'
import {R, z} from '@openint/util'

export const APOLLO_ENTITY_NAME = ['contact', 'account'] as const

export const apolloSchemas = {
  name: z.literal('apollo'),
  // Should get this from apollo sdk def...
  // resourceSettings: z.object({
  //   api_key: z.string(),
  // }),
  // TODO: Migrate away from nango...
  resourceSettings: oauthBaseSchema.resourceSettings,
  sourceOutputEntities: R.mapToObj(APOLLO_ENTITY_NAME, (k) => [k, z.unknown()]),
} satisfies ConnectorSchemas

export const apolloHelpers = connHelpers(apolloSchemas)

export const apolloDef = {
  name: 'apollo',
  schemas: apolloSchemas,
  metadata: {
    verticals: ['sales-engagement'],
    displayName: 'Apollo',
    stage: 'beta',
    logoUrl: '/_assets/logo-apollo.svg',
    openapiSpec: {proxied: oas as OpenApiSpec},
  },
} satisfies ConnectorDef<typeof apolloSchemas>

export default apolloDef
