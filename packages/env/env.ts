import {z} from '@opensdks/util-zod'
import {createEnv} from '@t3-oss/env-nextjs'
import {proxyRequired} from './proxyRequired'

export const envConfig = {
  server: {
    // MARK: - Not validated, may not be used...
    // Core env vars
    POSTGRES_URL: z.string().default('postgres://localhost:5432/postgres'),
    // TODO: Incorporate schema in the url itself.
    POSTGRES_SCHEMA: z.string().optional(),

    JWT_SECRET: z.string().optional(),
    CLERK_SECRET_KEY: z.string().optional(),
    NANGO_SECRET_KEY: z.string().optional(),

    // Required for worker to work when deployed
    INNGEST_SIGNING_KEY: z.string().optional(),
    INNGEST_EVENT_KEY: z.string().optional(),

    // Optional
    SENTRY_CRON_MONITOR_URL: z.string().optional(),

    // Turn on debug output, including drizzle. Should be a boolean tho
    DEBUG: z.string().optional(),

    // Variables set by Vercel when deployed
    VERCEL_URL: z.string().optional(),
    VERCEL_ENV: z.enum(['production', 'preview', 'development']).optional(),
  },
  client: {
    NEXT_PUBLIC_SERVER_URL: z.string().optional(),
    NEXT_PUBLIC_NANGO_PUBLIC_KEY: z.string().optional(),
    // Where the app is running. Only used by getServerUrl at the moment
    NEXT_PUBLIC_PORT: z.string().optional(),

    NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
    NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
    NEXT_PUBLIC_SENTRY_ORG: z.string().optional(),
    NEXT_PUBLIC_POSTHOG_WRITEKEY: z.string().optional(),
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
    NEXT_PUBLIC_CLERK_SUPABASE_JWT_TEMPLATE_NAME: z
      .string()
      .default('supabase'),
    NEXT_PUBLIC_COMMANDBAR_ORG_ID: z.string().optional(),
  },
  runtimeEnv: overrideFromLocalStorage({
    NEXT_PUBLIC_COMMANDBAR_ORG_ID: process.env['NEXT_PUBLIC_COMMANDBAR_ORG_ID'],
    NEXT_PUBLIC_SUPABASE_URL: process.env['NEXT_PUBLIC_SUPABASE_URL'],
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'],
    NEXT_PUBLIC_SENTRY_DSN: process.env['NEXT_PUBLIC_SENTRY_DSN'],
    NEXT_PUBLIC_SENTRY_ORG: process.env['NEXT_PUBLIC_SENTRY_ORG'],
    NEXT_PUBLIC_POSTHOG_WRITEKEY: process.env['NEXT_PUBLIC_POSTHOG_WRITEKEY'],
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'],
    NEXT_PUBLIC_CLERK_SUPABASE_JWT_TEMPLATE_NAME:
      process.env['NEXT_PUBLIC_CLERK_SUPABASE_JWT_TEMPLATE_NAME'],
    DEBUG: process.env['DEBUG'],
    JWT_SECRET: process.env['JWT_SECRET'],
    CLERK_SECRET_KEY: process.env['CLERK_SECRET_KEY'],
    NANGO_SECRET_KEY: process.env['NANGO_SECRET_KEY'],
    SENTRY_CRON_MONITOR_URL: process.env['SENTRY_CRON_MONITOR_URL'],
    VERCEL_ENV: process.env['VERCEL_ENV'],
    POSTGRES_SCHEMA: process.env['POSTGRES_SCHEMA'],
    INNGEST_EVENT_KEY: process.env['INNGEST_EVENT_KEY'],
    INNGEST_SIGNING_KEY: process.env['INNGEST_SIGNING_KEY'],
    NEXT_PUBLIC_NANGO_PUBLIC_KEY: process.env['NEXT_PUBLIC_NANGO_PUBLIC_KEY'],
    NEXT_PUBLIC_PORT: process.env['NEXT_PUBLIC_PORT'],
    NEXT_PUBLIC_SERVER_URL: process.env['NEXT_PUBLIC_SERVER_URL'],
    POSTGRES_URL: process.env['POSTGRES_URL'],
    VERCEL_URL: process.env['VERCEL_URL'],
  }),
} satisfies Parameters<typeof createEnv>[0]

export const env = createEnv(envConfig)

export const envRequired = proxyRequired(env, {
  formatError(key) {
    return new Error(`Missing required env var: ${key}`)
  },
})

export type Env = typeof env

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
;(globalThis as any).env = env

/** Allow NEXT_PUBLIC values to be overwriten from localStorage for debugging purposes */
function overrideFromLocalStorage<T>(runtimeEnv: T) {
  if (typeof window !== 'undefined' && window.localStorage) {
    for (const key in runtimeEnv) {
      if (key.startsWith('NEXT_PUBLIC_')) {
        const value = window.localStorage.getItem(key)
        if (value != null) {
          runtimeEnv[key] = value as T[Extract<keyof T, string>]
          console.warn(`[env] Overriding from localStorage ${key} = ${value}`)
        }
      }
    }
  }
  return runtimeEnv
}
