/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
// This file configures the initialization of Sentry on the browser.
// The config you add here will be used whenever a page is visited.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
import * as Sentry from '@sentry/nextjs'


const SENTRY_DSN =
  process.env['SENTRY_DSN'] || process.env['NEXT_PUBLIC_SENTRY_DSN']

const NODE_ENV = process.env.NODE_ENV || process.env['NEXT_PUBLIC_NODE_ENV']

if (!SENTRY_DSN) {
  console.warn('SENTRY_DSN not set, skipping sentry initialization')
} else {
  Sentry.init({
    enabled: NODE_ENV === 'production',
    dsn: SENTRY_DSN,
    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: 1.0,
    // ...
    // Note: if you want to override the automatic release value, do not set a
    // `release` value here - use the environment variable `SENTRY_RELEASE`, so
    // that it will also get attached to your source maps
  })
  Sentry.setTags({
    'vercel.env':
      process.env['VERCEL_ENV'] || process.env['NEXT_PUBLIC_VERCEL_ENV'],
    'git.branch':
      process.env['VERCEL_GIT_COMMIT_REF'] ||
      process.env['NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF'],
  })
}

console.log('sentry initialized')
