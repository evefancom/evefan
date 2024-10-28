import {z} from '@openint/vdk'

// This is a simplified version of the airbyte protocol

const keyPath = z.array(z.string())
export const sync_mode = z.enum(['full_refresh', 'incremental'])

export const stream = z.object({
  name: z.string(),
  json_schema: z.record(z.unknown()),
  // default_cursor_field: z.array(z.string()).optional(),
  source_defined_primary_key: z.array(keyPath).optional(),
})

export const record_data = z.unknown()

export const record = z.object({
  data: record_data,
  stream: z.string(),
})

export const message_catalog = z.object({
  streams: z.array(stream),
  type: z.literal('CATALOG'),
})
export type MessageCatalog = z.infer<typeof message_catalog>

export const message_record = z.object({
  record,
  type: z.literal('RECORD'),
})
export type MessageRecord = z.infer<typeof message_record>

export const message_state = z.object({
  state: z.unknown(),
  type: z.literal('STATE'),
})
export type MessageState = z.infer<typeof message_state>

export const message = z.discriminatedUnion('type', [
  message_catalog,
  message_record,
  message_state,
])
export type Message = z.infer<typeof message>

export const configured_stream = z.object({
  stream,
  sync_mode,
  // TODO: figure out how airbyte does column selection during replication
  additional_fields: z.array(z.string()).optional(),
})

export const configured_catalog = z.object({
  streams: z.array(configured_stream),
})

export const stream_state = z.object({
  stream_description: z.object({name: z.string(), namespace: z.string()}),
  stream_state: z.record(z.unknown()),
})

export const global_state = z.object({
  shared_state: z.record(z.unknown()).optional(),
  stream_states: z.array(stream_state),
})
