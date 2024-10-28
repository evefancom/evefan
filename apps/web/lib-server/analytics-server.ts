import {PostHog} from 'posthog-node'
import {env} from '@openint/app-config/env'
import {zUserId} from '@openint/cdk'
import {zEvent, zUserTraits} from '@openint/engine-backend/events'
import {noopFunctionMap, z, zFunction} from '@openint/util'

export const makeServerAnalytics = zFunction(z.string(), (writeKey: string) => {
  const posthog = new PostHog(writeKey, {})

  // TODO: how to make me chainable .track().flush() without using a class?
  // Consider creating a userAnalytics "subclass" that confirms to the same api
  // as browserAnalytics to facilitate reuse.
  return {
    identify: z
      .function()
      .args(zUserId, zUserTraits)
      .implement((userId, traits) =>
        posthog.identify({distinctId: userId, properties: traits}),
      ),
    track: z
      .function()
      .args(zUserId, zEvent)
      .implement((userId, event) =>
        posthog.capture({
          distinctId: userId,
          event: event.name,
          properties: event.data,
        }),
      ),
    flush: async (opts = {ignoreErrors: true}) => {
      // FlushAsync does not appear documented.
      // Instead we need to use shutdownAsync
      // await posthog.flushAsync()
      await posthog.shutdownAsync().catch((err) => {
        if (!opts.ignoreErrors) {
          throw err
        }
        console.warn('Failed to flush to posthog', err)
      })
    },
  }
})

export const serverAnalytics = env.NEXT_PUBLIC_POSTHOG_WRITEKEY
  ? makeServerAnalytics(env.NEXT_PUBLIC_POSTHOG_WRITEKEY)
  : noopFunctionMap<ReturnType<typeof makeServerAnalytics>>()
