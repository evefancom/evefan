import '@openint/app-config/register.node'
import {contextFactory} from '@openint/app-config/backendConfig'
import type {EndUserId} from '@openint/cdk'
import {zEndUserId, zId, zUserId} from '@openint/cdk'
import {flatRouter} from '@openint/engine-backend'
import {inngest} from '@openint/engine-backend/events'
import {getPool, sql} from '../lib-server'
import {serverAnalytics} from '../lib-server/analytics-server'
import * as routines from './routines'

export const scheduleSyncs = inngest.createFunction(
  {id: 'Schedule pipeline syncs'},
  // Disable scheduling during development, can be explicitly triggered from /api/inngest UI
  process.env.NODE_ENV === 'development'
    ? {event: 'sync/scheduler-debug'}
    : {cron: '0 * * * *'}, // Once an hour, https://crontab.guru/#0_*_*_*_*
  routines.scheduleSyncs,
)

export const syncPipeline = inngest.createFunction(
  {id: 'Sync pipeline'},
  {event: 'sync/pipeline-requested'},
  routines.syncPipeline,
)

export const syncResource = inngest.createFunction(
  {id: 'Sync resource'},
  {event: 'sync/resource-requested'},
  async ({event}) => {
    try {
      const {resourceId} = event.data
      console.log('Will sync resource', resourceId)
      // TODO: Figure out what is the userId we ought to be using...

      const pool = await getPool()
      const endUserId = await pool.oneFirst<EndUserId>(
        sql`SELECT clientId FROM resource WHERE id = ${resourceId}`,
      )
      console.log('endUserId', endUserId)
      await flatRouter
        .createCaller({
          ...contextFactory.fromViewer({role: 'system'}),
          remoteResourceId: null,
        })
        .syncResource({id: resourceId})

      console.log('did sync pipeline', resourceId)
      return resourceId
    } catch (err) {
      console.error('Error running syncResource', err)
      throw err
    }
  },
)

export const handleWebhook = inngest.createFunction(
  {id: 'Handle webhook'},
  {event: 'webhook/received'},
  async ({event: {data}}) => {
    if (data.path.startsWith('database')) {
      console.log('handle database event', data)
      await handleDatabaseWebhook(data.body as any)
    } else if (data.path.startsWith('connector/')) {
      // TODO: handle me right
      console.log('handle connector event', data.path)
    } else {
      console.warn('Unexpected webhook received', data)
    }
  },
)

interface InsertPayload {
  type: 'INSERT'
  table: string
  schema: string
  record: Record<string, unknown> // TableRecord<T>
  old_record: null
}
interface UpdatePayload {
  type: 'UPDATE'
  table: string
  schema: string
  record: Record<string, unknown> // TableRecord<T>
  old_record: Record<string, unknown> // TableRecord<T>
}
interface DeletePayload {
  type: 'DELETE'
  table: string
  schema: string
  record: null
  old_record: Record<string, unknown> // TableRecord<T>
}
type ChangePayload = InsertPayload | UpdatePayload | DeletePayload

async function handleDatabaseWebhook(c: ChangePayload) {
  // Consider using pattern matching for this, assuming does not impact ts perf too muach
  if (c.schema === 'auth' && c.table === 'users') {
    if (c.type === 'INSERT') {
      serverAnalytics.track(zUserId.parse(c.record['id']), {
        name: 'db/user-created',
        data: {},
      })
    } else if (c.type === 'DELETE') {
      serverAnalytics.track(zUserId.parse(c.old_record['id']), {
        name: 'db/user-deleted',
        data: {},
      })
    }
  } else if (c.schema === 'public' && c.table === 'resource') {
    // Ignore postgres events for now...
    if (c.type === 'INSERT' && c.record['provider_name'] !== 'postgres') {
      serverAnalytics.track(zEndUserId.parse(c.record['end_user_id']), {
        name: 'db/resource-created',
        data: {resourceId: zId('reso').parse(c.record['id'])},
      })
    } else if (c.type === 'DELETE') {
      serverAnalytics.track(zEndUserId.parse(c.old_record['end_user_id']), {
        name: 'db/resource-deleted',
        data: {resourceId: zId('reso').parse(c.old_record['id'])},
      })
    }
  }
  await serverAnalytics.flush()
}
