import yodleeClientConnector from './client'
import yodleeDef from './def'
import {yodleeServerConnector} from './server'

export const yodleeProvider = {
  ...yodleeDef,
  ...yodleeClientConnector,
  ...yodleeServerConnector,
}

// codegen:start {preset: barrel, include: "./{*.{ts,tsx},*/index.{ts,tsx}}", exclude: "{./**/*.{d,spec,test,fixture,gen,node}.{ts,tsx},./*.generated/*}"}
export * from './client'
export * from './def'
export * from './request.noop'
export * from './server'
export * from './yodlee-utils'
export * from './yodlee.types'
export * from './YodleeClient'
// codegen:end
