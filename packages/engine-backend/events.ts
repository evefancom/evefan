import type {Combine, EventsFromOpts} from 'inngest'
import {EventSchemas, Inngest} from 'inngest'
import type {ZodToStandardSchema} from 'inngest/components/EventSchemas'
import {zId} from '@openint/cdk'
import type {NonEmptyArray} from '@openint/util'
import {R, z} from '@openint/util'

// TODO: Implement webhook as events too

export const zUserTraits = z
  .object({
    /** Also sets the display name in posthog ui */
    name: z.string(),
    email: z.string(),
    phone: z.string(),
  })
  .partial()

export type UserTraits = z.infer<typeof zUserTraits>

export const zOrgProperties = z
  .object({
    webhook_url: z.string(),
  })
  .partial()

export type OrgProperties = z.infer<typeof zOrgProperties>

// TODO: Can we learn from trpc to make all the events here easy to refactor across the codebase?
export const eventMap = {
  // New format for event name. Having `/` is not supported in event names due to slash having
  // very specific meanning in openapi spec.
  'sync.completed': {
    pipeline_id: zId('pipe'),
    source_id: zId('reso'),
    destination_id: zId('reso'),
  },
  // Backend events
  'debug/debug': {},
  'sync/scheduler-debug': {},
  'sync/pipeline-requested': {pipelineId: zId('pipe')},
  'sync/resource-requested': {resourceId: zId('reso')},
  'connect/resource-connected': {resourceId: zId('reso')},
  'webhook/received': {
    /** For debugging requests */
    traceId: z.string(),
    method: z.string(),
    path: z.string(),
    query: z.record(z.unknown()),
    headers: z.record(z.unknown()),
    body: z.unknown(),
  },
  // Analytics events
  'db/user-created': {},
  'db/user-deleted': {},
  'db/resource-created': {resourceId: zId('reso')},
  'db/resource-deleted': {resourceId: zId('reso')},
  'user/signin': {},
  'user/signout': {},
  'connect/session-started': {connectorName: z.string(), meta: z.unknown()},
  'connect/session-cancelled': {connectorName: z.string(), meta: z.unknown()},
  'connect/session-succeeded': {connectorName: z.string(), meta: z.unknown()},
  'connect/session-errored': {connectorName: z.string(), meta: z.unknown()},
  'api/token-copied': {},
  'api/graphql-request': {},
  'api/rest-request': {},
} satisfies Record<string, z.ZodRawShape>

type BuiltInEvents = EventsFromOpts<{schemas: EventSchemas; id: never}>

const eventMapForInngest = R.mapValues(eventMap, (v) => ({
  data: z.object(v),
})) as unknown as {
  [k in keyof typeof eventMap]: {
    data: z.ZodObject<(typeof eventMap)[k]>
  }
}

/** slash in name is not supported in openapi spec. Plus we don't want to send all events to orgs for now */
export const outgoingWebhookEventMap = R.omitBy(eventMapForInngest, (_, name) =>
  name.includes('/'),
)

export type Events = Combine<
  BuiltInEvents,
  ZodToStandardSchema<typeof eventMapForInngest>
>

export const inngest = new Inngest({
  id: 'OpenInt',
  schemas: new EventSchemas().fromZod(eventMapForInngest),
  // TODO: have a dedicated browser inngest key
  eventKey: process.env['INNGEST_EVENT_KEY'] ?? 'local',
  // This is needed in the browser otherwise we get failed to execute fetch on Window
  // due to the way Inngest uses this.fetch when invoking fetch
  fetch: globalThis.fetch.bind(globalThis),
})

// MARK: - Deprecated

export const zEvent = z.discriminatedUnion(
  'name',
  Object.entries(eventMap).map(([name, props]) =>
    z.object({name: z.literal(name), data: z.object(props)}),
  ) as unknown as NonEmptyArray<
    {
      [k in keyof typeof eventMap]: z.ZodObject<{
        name: z.ZodLiteral<k>
        data: z.ZodObject<(typeof eventMap)[k]>
      }>
    }[keyof typeof eventMap]
  >,
)

export type Event = z.infer<typeof zEvent>
