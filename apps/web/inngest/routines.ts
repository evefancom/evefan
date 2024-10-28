import {backendEnv, contextFactory} from '@openint/app-config/backendConfig'
import {env} from '@openint/app-config/env'
import '@openint/app-config/register.node'
import type {SendEventPayload} from 'inngest/helpers/types'
import {flatRouter} from '@openint/engine-backend'
import type {Events, OrgProperties} from '@openint/engine-backend'
import {makeSentryClient} from '../lib-server/sentry-client'

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const sentry = makeSentryClient({dsn: env.NEXT_PUBLIC_SENTRY_DSN!})

/**
 * Unlike functions, routines are designed to run without dependency on Inngest
 * So they can be used with any job queue system, such as BullMQ or home grown system built
 * on top of postgres / redis / pubsub / whatever.
 */
export interface FunctionInput<T extends keyof Events> {
  // NOTE: This is not the full set of fields exposed by Inngest. there are more...
  event: {data: Events[T]['data']; id?: string; name: T; user?: OrgProperties}
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

export async function scheduleSyncs({step}: FunctionInput<never>) {
  await sentry.withCheckin(backendEnv.SENTRY_CRON_MONITOR_URL, async () => {
    await flatRouter
      .createCaller({
        ...contextFactory.fromViewer({role: 'system'}),
        remoteResourceId: null,
      })
      .ensureDefaultPipelines()

    const pipelines = await contextFactory.config
      .getMetaService({role: 'system'})
      // Every hour
      .findPipelines({secondsSinceLastSync: 1 * 60 * 60})
    console.log(`Found ${pipelines.length} pipelines needing to sync`)

    if (pipelines.length > 0) {
      await step.sendEvent(
        'sync/pipeline-requested',
        pipelines.map((pipe) => ({
          name: 'sync/pipeline-requested',
          data: {pipelineId: pipe.id},
        })),
      )
      // https://discord.com/channels/842170679536517141/845000011040555018/1068696979284164638
      // We can use the built in de-dupe to ensure that we never schedule two pipeline syncs automatically within an hour...
      console.log(`Scheduled ${pipelines.length} pipeline syncs`)
    }
    return {
      scheduledCount: pipelines.length,
      // For debugging
      // sentryCheckinId: checkinId,
      // sentryMonitorId: backendEnv.SENTRY_CRON_MONITOR_ID,
    }
  })
}

// Consider automatic inngest function from every trpc function?
export async function syncPipeline({
  event,
}: FunctionInput<'sync/pipeline-requested'>) {
  const {pipelineId} = event.data
  console.log('Will sync pipeline', pipelineId)
  // TODO: Figure out what is the userId we ought to be using...
  // Otherwise connections could be overwritten with the wrong id...
  // This upsert stuff is dangerous...
  await flatRouter
    .createCaller({
      ...contextFactory.fromViewer({role: 'system'}),
      remoteResourceId: null,
    })
    .syncPipeline({id: pipelineId})
  console.log('did sync pipeline', pipelineId)
  return pipelineId
}

export async function sendWebhook({event}: FunctionInput<keyof Events>) {
  if (!event.user?.webhook_url) {
    return false
  }

  // We shall let inngest handle the retries and backoff for now
  // Would be nice to have a openSDK for sending webhook payloads that are typed actually, after all it has
  // the exact same shape as paths.
  const res = await fetch(event.user.webhook_url, {
    method: 'POST',
    body: JSON.stringify(event),
    headers: {
      'content-type': 'application/json',
      // TODO: Adopt standardwebhooks and implement webhook signing
    },
  })
  const responseAsJson = await responseToJson(res)
  return {...responseAsJson, target: event.user.webhook_url}
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
