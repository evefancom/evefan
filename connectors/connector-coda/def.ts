import codaOas from '@opensdks/sdk-coda/coda.oas.json'
import type {ConnectorDef, ConnectorSchemas, OpenApiSpec} from '@openint/cdk'
import {connHelpers} from '@openint/cdk'
import {z} from '@openint/util'

// type components = CodaSDKTypes['oas']['components']

function modify<T>(input: T, fn: (input: T) => void): T {
  fn(input)
  return input
}

export const codaSchemas = {
  name: z.literal('coda'),
  resourceSettings: z.object({apiKey: z.string()}),
} satisfies ConnectorSchemas

export const codaDef = {
  schemas: codaSchemas,
  name: 'coda',
  metadata: {
    verticals: ['flat-files-and-spreadsheets'],
    logoUrl: '/_assets/logo-coda.svg',
    stage: 'beta',
    openapiSpec: {
      proxied: modify(codaOas, (oas) => {
        oas.security = [] // remove security from the spec generally as it is not needed due to proxying
      }) as unknown as OpenApiSpec,
    },
  },
} satisfies ConnectorDef<typeof codaSchemas>

export const helpers = connHelpers(codaSchemas)

export default codaDef
