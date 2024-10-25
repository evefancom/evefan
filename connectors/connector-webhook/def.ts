import type {
  AnyEntityPayload,
  ConnectorDef,
  ConnectorSchemas,
} from '@openint/cdk'
import {connHelpers} from '@openint/cdk'
import {z, zCast} from '@openint/util'

export const webhookSchemas = {
  name: z.literal('webhook'),
  resourceSettings: z.object({
    destinationUrl: z.string(),
  }),
  destinationInputEntity: zCast<AnyEntityPayload>(),
} satisfies ConnectorSchemas

export const webhookHelpers = connHelpers(webhookSchemas)

export const webhookDef = {
  name: 'webhook',
  metadata: {verticals: ['streaming'], logoUrl: '/_assets/logo-webhook.png'},

  schemas: webhookSchemas,
} satisfies ConnectorDef<typeof webhookSchemas>

export default webhookDef
