import type {ConnectorDef, ConnectorSchemas} from '@openint/cdk'
import {connHelpers, zWebhookInput} from '@openint/cdk'
import {z} from '@openint/util'

export const debugSchemas = {
  name: z.literal('debug'),
  webhookInput: zWebhookInput,
  resourceSettings: z.unknown(),
  connectorConfig: z.unknown(),
  sourceOutputEntity: z.unknown(),
  integrationData: z.unknown(),
} satisfies ConnectorSchemas

export const helpers = connHelpers(debugSchemas)

export const debugDef = {
  metadata: {stage: 'hidden'},
  name: 'debug',
  schemas: debugSchemas,
} satisfies ConnectorDef<typeof debugSchemas>

export default debugDef
