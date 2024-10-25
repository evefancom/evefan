import posthog from 'posthog-js'
import {zUserId} from '@openint/cdk'
import {zEvent, zUserTraits} from '@openint/engine-backend/events'
import {z, zFunction} from '@openint/util'
import {Sentry} from '../sentry.client.config'

let initialized = false

// TODO: Use the noopFunctionMap pattern to make this more robust.

export const browserAnalytics = {
  // Divided on whether we should use zFunction or use the more verbose z.function()...
  init: zFunction(z.string(), (writeKey) => {
    if (!writeKey) {
      console.warn('No write key provided, analytics will be noop')
    }
    posthog.init(writeKey, {api_host: '/_posthog', autocapture: true})
    initialized = true
  }),
  identify: z
    .function()
    .args(zUserId, zUserTraits.optional())
    .implement((userId, traits) => {
      if (!initialized) {
        return
      }
      posthog.identify(userId, traits)
      Sentry.setUser({id: userId, email: traits?.email})
    }),
  track: z
    .function()
    .args(zEvent)
    .implement((event) => {
      if (!initialized) {
        return
      }
      posthog.capture(event.name, event.data)
      Sentry.setUser(null)
    }),
  reset: () => {
    if (!initialized) {
      return
    }
    return posthog.reset()
  },
}
;(globalThis as any).posthog = posthog
;(globalThis as any).browserAnalytics = browserAnalytics
