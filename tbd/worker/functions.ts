import {eq, sql} from 'drizzle-orm'
import type {SendEventPayload} from 'inngest/helpers/types'
import type {OpenIntHeaders} from '@openint/api'
import {createAppHandler} from '@openint/api'
import type {Id} from '@openint/cdk'
import {VERTICAL_BY_KEY, makeJwtClient} from '@openint/cdk'
import {
  configDb,
  dbUpsert,
  ensureSchema,
  getCommonObjectTable,
  getDb,
  schema,
  stripNullByte,
} from '@openint/db'
import {envRequired} from '@openint/env'
import type {Events} from '@openint/events'
import {initOpenIntSDK} from '@openint/sdk'
import {HTTPError, parseErrorInfo} from '../../packages/trpc/errors'

/**
 * Unlike functions, routines are designed to run without dependency on Inngest
 * So they can be used with any job queue system, such as BullMQ or home grown system built
 * on top of postgres / redis / pubsub / whatever.
 */
export type FunctionInput<T extends keyof Events> = {
  // NOTE: This is not the full set of fields exposed by Inngest. there are more...
  event: {data: Events[T]['data']; id?: string; name: T}
  step: {
    run: <T>(name: string, fn: () => Promise<T>) => Promise<T> | T
    sendEvent: (
      stepId: string,
      events: SendEventPayload<Events>,
    ) => Promise<unknown> // SendEventOutput
  }
}
type SingleNoArray<T> = T extends Array<infer U> ? U : T
export type EventPayload = SingleNoArray<SendEventPayload<Events>>

export async function scheduleSyncs({
  step,
  event,
}: FunctionInput<'scheduler.requested'>) {
  console.log('[scheduleSyncs]', event)
  const {openint} = initSDK()
  // TODO: Deal with pagination
  const resources = await openint.GET('/core/resource').then((r) => r.data)

  const events = resources
    .map((r) => {
      if (!event.data.connector_names.includes(r.connectorName)) {
        // Only sync these for now...
        return null
      }
      console.log(`[scheduleSyncs] Will sendEvent for ${r.id}`)
      return {
        name: 'sync.requested',
        data: {
          resource_id: r.id,
          vertical: event.data.vertical,
          sync_mode: event.data.sync_mode,
        },
      } satisfies EventPayload
    })
    .filter((c): c is NonNullable<typeof c> => !!c)

  console.log('[scheduleSyncs] Metrics', {
    num_resources: resources.length,
    num_resources_to_sync: events.length,
  })

  await step.sendEvent('emit-connection-sync-events', events)
  // make it easier to see...
  return events.map((e) => ({
    customer_id: e.data.resource_id,
  }))
}

const sqlNow = sql`now()`

// TODO: We should Cancel previous sync if it's still running...
// or not allow new syncs. Full sync should probably be prioritized over incremental syncs.
export async function syncConnection({
  event,
  step,
}: FunctionInput<'sync.requested'>) {
  const {
    data: {
      resource_id,
      vertical,
      unified_objects: _unified_objects,
      sync_mode = 'incremental',
      page_size,
    },
  } = event

  const unified_objects =
    _unified_objects ?? VERTICAL_BY_KEY[vertical].objects ?? []

  console.log('[syncConnection] Start', {
    resource_id,
    eventId: event.id,
    sync_mode,
    vertical,
    unified_objects,
  })

  // This can probably be done via an upsert returning...
  const syncState = await configDb.query.sync_state
    .findFirst({
      where: eq(schema.sync_state.resource_id, resource_id),
    })
    .then(
      (ss) =>
        ss ??
        // eslint-disable-next-line promise/no-nesting
        configDb
          .insert(schema.sync_state)
          .values({resource_id, state: sql`${{}}::jsonb`})
          .returning()
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          .then((rows) => rows[0]!),
    )

  const syncRunId = await configDb
    .insert(schema.sync_run)
    .values({
      input_event: sql`${event}::jsonb`,
      initial_state: sql`${syncState.state}::jsonb`,
      started_at: sqlNow,
    })
    .returning()
    .then((rows) => rows[0]!.id)

  const {openint, jwt} = initSDK({
    'x-resource-id': resource_id as `reso_${string}`,
  })

  // Should we get the orgId and customerId as part of input ideally already?

  const overallState = (syncState.state ?? {}) as Record<
    string,
    {cursor?: string | null}
  >

  let errorInfo: Awaited<ReturnType<typeof parseErrorInfo>> | undefined

  const metrics: Record<string, number | string> = {}

  function incrementMetric(name: string, amount = 1) {
    const metric = metrics[name]
    metrics[name] = (typeof metric === 'number' ? metric : 0) + amount
    return metrics[name] as number
  }
  function setMetric<T extends string | number>(name: string, value: T) {
    metrics[name] = value
    return metrics[name] as T
  }

  try {
    async function syncStreamPage(
      stream: string,
      table: ReturnType<typeof getCommonObjectTable>,
      state: {cursor?: string | null},
    ) {
      try {
        const res = await openint.GET(
          `/unified/${vertical}/${stream}` as '/unified/crm/contact',
          {params: {query: {cursor: state.cursor, page_size}}},
        )
        const count = incrementMetric(`${stream}_count`, res.data.items.length)
        incrementMetric(`${stream}_page_count`)
        console.log(`Syncing ${vertical} ${stream} count=${count}`)
        if (res.data.items.length) {
          await dbUpsert(
            db,
            table,
            res.data.items.map(({raw_data, ...item}) => ({
              // Primary keys
              source_id: resource_id,
              id: item.id,
              // Other columns
              created_at: sqlNow,
              updated_at: sqlNow,
              is_deleted: false,
              // Workaround jsonb support issue... https://github.com/drizzle-team/drizzle-orm/issues/724
              raw: sql`${stripNullByte(raw_data) ?? null}::jsonb`,
              unified: sql`${stripNullByte(item)}::jsonb`,
            })),
            {insertOnlyColumns: ['created_at'], noDiffColumns: ['updated_at']},
          )
        }
        return {
          next_cursor: res.data.next_cursor,
          has_next_page: res.data.has_next_page,
        }
      } catch (err) {
        // HTTP 501 not implemented
        if (err instanceof HTTPError && err.code === 501) {
          // NOTE: vercel doesn't understand console.warn unfortunately... so this will show up as error
          // https://vercel.com/docs/observability/runtime-logs#level
          console.warn(
            `[sync progress] ${resource_id} does not implement ${stream}`,
          )
          return {has_next_page: false, next_cursor: null}
        }
        throw err
      }
    }

    async function syncStream(stream: string) {
      const fullEntity = `${vertical}_${stream}`
      console.log('[syncConnection] Syncing', fullEntity)
      const table = getCommonObjectTable(fullEntity, {
        schema: synced_data_schema,
      })
      await db.execute(table.createIfNotExistsSql())
      const state = sync_mode === 'full' ? {} : overallState[stream] ?? {}
      overallState[stream] = state
      const streamSyncMode = state.cursor ? 'incremental' : 'full'
      setMetric(`${stream}_sync_mode`, streamSyncMode)

      while (true) {
        // const ret = await step.run(
        //   `${stream}-sync-${state.cursor ?? ''}`,
        //   iteratePage,
        // )
        const ret = await syncStreamPage(stream, table, state)
        console.log('[sync progress]', {
          stream,
          completed_cursor: state.cursor,
          ...ret,
        })
        state.cursor = ret.next_cursor
        // Persist state. TODO: Figure out how to make this work with step function
        await Promise.all([
          dbUpsert(
            configDb,
            schema.sync_state,
            [
              {
                ...syncState,
                state: sql`${overallState}::jsonb`,
                updated_at: sqlNow,
              },
            ],
            {
              shallowMergeJsonbColumns: ['state'], // For race condition / concurrent sync of multiple streams
              noDiffColumns: ['created_at', 'updated_at'],
            },
          ),
          // Should this happen in a transaction? doesn't seem necessary but still
          configDb
            .update(schema.sync_run)
            .set({
              // Should we call it currentState instead? Also do we need it on the sync_state itself?
              final_state: sql`${overallState}::jsonb`,
              metrics: sql`${metrics}::jsonb`,
            })
            .where(eq(schema.sync_run.id, syncRunId)),
        ])
        if (!ret.has_next_page) {
          break
        }
      }
    }
    const reso = await openint
      .GET('/core/resource/{id}', {params: {path: {id: resource_id}}})
      .then((r) => r.data)

    const org = await openint
      .GET('/viewer/organization', {
        headers: {
          authorization: `Bearer ${jwt.signViewer({
            role: 'org',
            orgId: reso.connector_config.orgId as Id['org'],
          })}`,
        },
      })
      .then((r) => r.data)

    if (!org.publicMetadata.database_url) {
      throw new Error(`org does not have a database_url: ${org.id}`)
    }
    const synced_data_schema = org.publicMetadata.synced_data_schema ?? 'synced'
    const {db, pg} = getDb(org.publicMetadata.database_url, {})

    // Load this from a config please...
    if (synced_data_schema) {
      await ensureSchema(db, synced_data_schema)
      console.log('[syncConnection] Ensured schema', synced_data_schema)
    }
    // TODO: Collect list of errors not just the last one...
    for (const stream of unified_objects) {
      try {
        await syncStream(stream)
      } catch (err) {
        errorInfo = await parseErrorInfo(err)
        // No longer authenticated error means we should be able to break out of all other streams, it's unnecessary.
        // Will need to think more about how this works for parallel read scenarios though.
        if (errorInfo?.error_type === 'USER_ERROR') {
          break
        }
        console.error('[syncConnection] Error syncing stream', stream, err)
      }
    }
    // TODO: Put pg.end() in a finally block
    await pg.end()
  } catch (err) {
    errorInfo = await parseErrorInfo(err)
  } finally {
    await configDb
      .update(schema.sync_run)
      .set({
        ...errorInfo,
        completed_at: sqlNow,
        final_state: sql`${overallState}::jsonb`,
        metrics: sql`${metrics}::jsonb`,
      })
      .where(eq(schema.sync_run.id, syncRunId))
  }

  const status = errorInfo?.error_type ?? 'SUCCESS'
  await step.sendEvent('sync.completed', {
    name: 'sync.completed',
    data: {
      resource_id,
      vertical,
      unified_objects,
      sync_mode,
      page_size,
      //
      request_event_id: event.id,
      run_id: syncRunId,
      metrics,
      result: status,
      error_detail: errorInfo?.error_detail,
    },
  })
  console.log(`[syncConnection] Complete ${status}`, {
    resource_id,
    status,
    event_id: event.id,
    metrics,
    error: errorInfo,
    final_state: overallState,
  })
  // Return metrics to make it easier to debug in inngest
  return {syncRunId, metrics}
}

export async function triggerImmediateSync({
  event,
  step,
}: FunctionInput<'connection.created'>) {
  const data = {
    ...event.data,
    vertical: 'crm',
  } satisfies Events['sync.requested']['data']
  await step.sendEvent('sync.requested', {name: 'sync.requested', data})

  return data
}

export async function sendWebhook({event}: FunctionInput<keyof Events>) {
  const resourceId =
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    'resource_id' in event.data ? (event.data.resource_id as string) : null
  if (!resourceId) {
    console.log('No resource_id in event, passing', event)
    return false
  }

  const {openint, jwt} = initSDK()
  const reso = await openint
    .GET('/core/resource/{id}', {params: {path: {id: resourceId}}})
    .then((r) => r.data)

  const org = await openint
    .GET('/viewer/organization', {
      headers: {
        authorization: `Bearer ${jwt.signViewer({
          role: 'org',
          orgId: reso.connector_config.orgId as Id['org'],
        })}`,
      },
    })
    .then((r) => r.data)

  if (!org.publicMetadata.webhook_url) {
    console.log('No webhook_url in org, passing', org)
    return false
  }

  // We shall let inngest handle the retries and backoff for now
  // Would be nice to have a openSDK for sending webhook payloads that are typed actually, after all it has
  // the exact same shape as paths.
  const res = await fetch(org.publicMetadata.webhook_url, {
    method: 'POST',
    body: JSON.stringify(event),
    headers: {
      'content-type': 'application/json',
      // TODO: Adopt standardwebhooks and implement webhook signing
    },
  })
  const responseAsJson = await responseToJson(res)
  return {...responseAsJson, target: org.publicMetadata.webhook_url}
}

async function responseToJson(res: Response) {
  return {
    headers: Object.fromEntries(res.headers.entries()),
    status: res.status,
    statusText: res.statusText,
    body: safeJsonParse(await res.text()),
  }
}

function safeJsonParse(str: string) {
  try {
    return JSON.parse(str) as unknown
  } catch {
    return str
  }
}

function initSDK(headers?: OpenIntHeaders) {
  const jwt = makeJwtClient({secretOrPublicKey: envRequired.JWT_SECRET})
  const openint = initOpenIntSDK({
    headers: {
      authorization: `Bearer ${jwt.signViewer({role: 'system'})}`,
      ...headers,
    },
    // Bypass the normal fetch link http round-tripping back to our server and handle the BYOS request directly!
    // Though we are losing the ability to debug using Proxyman and others... So maybe make this configurable in
    // development
    links: [createAppHandler()],
    // baseUrl: 'http://localhost:4000/api/v0',
  })
  return {openint, jwt}
}
