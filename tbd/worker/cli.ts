/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {parseArgs} from 'node:util'
import {configDb, configPg, desc, eq, schema} from '@openint/db'
import {testEnv} from '@openint/env'
import type {Events} from '@openint/events'
import * as routines from './functions'

/** Mimic subset of Inngest StepTools UI */
const step: routines.FunctionInput<never>['step'] = {
  run: (name, fn) => {
    console.log('[step.run]', name)
    return fn()
  },
  // eslint-disable-next-line @typescript-eslint/require-await
  sendEvent: async (stepId, events) => {
    console.log('[step.sendEvent]', stepId, JSON.stringify(events, null, 2))
  },
}

const {
  positionals: [cmd],
} = parseArgs({
  // options: {output: {type: 'string', short: 'o'}},
  allowPositionals: true,
})

switch (cmd) {
  case 'sendWebhook':
    void routines.sendWebhook({
      event: {
        name: 'sync.completed',
        data: {resource_id: testEnv['RESOURCE_ID']!},
      },
      step,
    })
    break
  case 'scheduleSyncs':
    void routines
      .scheduleSyncs({
        event: {
          name: 'scheduler.requested',
          data: {
            connector_names: testEnv.CONNECTOR_NAME
              ? [testEnv.CONNECTOR_NAME]
              : ['hubspot', 'salesforce'],
            sync_mode: testEnv.SYNC_MODE ?? 'incremental',
            vertical: testEnv.VERTICAL ?? 'crm',
          },
        },
        step,
      })
      .finally(() => configPg.end())
    break
  case 'syncConnection':
    void routines
      .syncConnection({
        event: {
          name: 'sync.requested',
          data: {
            resource_id: testEnv['RESOURCE_ID']!,
            vertical: testEnv['VERTICAL']! as 'crm',
            unified_objects: testEnv['UNIFIED_OBJECT']
              ? [testEnv['UNIFIED_OBJECT']]
              : ['account', 'contact', 'opportunity', 'lead', 'user'],
            sync_mode: testEnv['SYNC_MODE'],
            page_size: testEnv['PAGE_SIZE']
              ? Number.parseInt(testEnv['PAGE_SIZE'])
              : undefined,
          },
        },
        step,
      })
      .finally(() => configPg.end())
    break
  case 'backfill':
    void runBackfill().finally(() => configPg.end())
    break
  default:
    console.error('Unknown command', cmd)
    process.exit(1)
}

async function runBackfill() {
  const syncEvents: Array<Events['sync.requested']> = []
  await routines.scheduleSyncs({
    event: {
      data: {
        connector_names: testEnv.CONNECTOR_NAME
          ? [testEnv.CONNECTOR_NAME]
          : ['hubspot', 'salesforce'],
        sync_mode: testEnv.SYNC_MODE ?? 'incremental',
        vertical: testEnv.VERTICAL ?? 'crm',
      },
      name: 'scheduler.requested',
    },
    step: {
      ...step,
      sendEvent(_stepId, _events) {
        const events = Array.isArray(_events) ? _events : [_events]
        syncEvents.push(
          ...events.filter(
            (e): e is Events['sync.requested'] =>
              e.name === 'connection.created',
          ),
        )
        return Promise.resolve()
      },
    },
  })
  let i = 0
  for (const event of syncEvents) {
    i++
    const lastRun = await configDb.query.sync_run.findFirst({
      where: eq(schema.sync_run.resource_id, event.data.resource_id),
      orderBy: desc(schema.sync_run.started_at),
    })
    // Should we handle timeout and other things?
    console.log('Backfill', i, 'of', syncEvents.length, event.data)
    if (
      (lastRun?.status === 'SUCCESS' || lastRun?.status === 'USER_ERROR') &&
      event.data.resource_id !== 'hubspot' // Need to redo hubspot unfortunately...
    ) {
      console.log(
        'Skipping backfill',
        i,
        'last run status',
        lastRun.status,
        event.data,
      )
      continue
    }
    await routines.syncConnection({
      event: {
        ...event,
        data: {
          ...event.data,
          ...(testEnv['UNIFIED_OBJECT'] && {
            unified_objects: [testEnv['UNIFIED_OBJECT']],
          }),
          ...(testEnv['SYNC_MODE'] && {
            sync_mode: testEnv['SYNC_MODE'],
          }),
        },
      },
      step,
    })
  }
}
