import {z} from '@opensdks/util-zod'
import type {EventsFromOpts} from 'inngest'
import type {
  Combine,
  EventSchemas,
  ZodToStandardSchema,
} from 'inngest/components/EventSchemas'

export const zResult = z.enum([
  'SUCCESS',
  // ...zErrorType.options, Cannot import due to outside package tho
  'USER_ERROR',
  'REMOTE_ERROR',
  'INTERNAL_ERROR',
])

const syncRequestedData = z.object({
  resource_id: z.string(),
  vertical: z.enum(['crm', 'engagement', 'ats']),
  unified_objects: z.array(z.string()).optional(),
  sync_mode: z
    .enum(['full', 'incremental'])
    .optional()
    .describe('Incremental by default'),
  /** Override the default page sizing, will be provider default otherwise... */
  page_size: z.number().optional(),
})

export const eventsMap = {
  'scheduler.requested': {
    data: z.object({
      connector_names: z.array(z.string()),
      vertical: z.enum(['crm', 'engagement', 'ats']),
      sync_mode: z.enum(['full', 'incremental']),
    }),
  },
  'sync.requested': {data: syncRequestedData},
  'sync.completed': {
    // We merge syncRequestData top level as things like sync_mode etc. can be modified during
    // the sync and it is therefore not accurate to call it request_data anymore.
    data: syncRequestedData.extend({
      request_event_id: z.string().optional(),
      run_id: z.string(),
      metrics: z.record(z.unknown()),
      result: zResult,
      error_detail: z.string().optional(),
    }),
  },
  'connection.created': {
    data: z.object({
      end_user_id: z.string(),
      resource_id: z.string(),
      // TODO: Add more fields later...
      // connection_id: z.string(),
      // result: zResult,
    }),
  },
}

type BuiltInEvents = EventsFromOpts<{schemas: EventSchemas; id: never}>

export type Events = Combine<
  BuiltInEvents,
  ZodToStandardSchema<typeof eventsMap>
>
