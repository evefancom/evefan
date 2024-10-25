import plaidClientConnector from './client'
import plaidDef from './def'
import plaidServerConnector from './server'

export {PlaidSDKTypes, plaidSdkDef} from '@opensdks/sdk-plaid'

export const plaidProvider = {
  ...plaidDef,
  ...plaidClientConnector,
  ...plaidServerConnector,
}

// codegen:start {preset: barrel, include: "./{*.{ts,tsx},*/index.{ts,tsx}}", exclude: "./**/*.{d,spec,test,fixture,types,gen}.{ts,tsx}"}
export * from './client'
export * from './def'
export * from './plaid-utils'
export * from './PlaidClient'
export * from './request.noop'
export * from './server'
// codegen:end

// Consider using "plaid" as peerDependency to reduce
// code bloat when shipping to react native environment
// Ideally however we should have separate packages for
// client / server usage, but that's a bit too much work for now
