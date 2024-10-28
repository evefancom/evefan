import type {initXeroSDK} from '@opensdks/sdk-xero'

// codegen:start {preset: barrel, include: "./{*.{ts,tsx},*/index.{ts,tsx}}", exclude: "./**/*.{d,spec,test,fixture,gen,node}.{ts,tsx}"}
export * from './def'
export * from './server'
// codegen:end

export * from '@opensdks/sdk-xero'

export type XeroSDK = ReturnType<typeof initXeroSDK>
