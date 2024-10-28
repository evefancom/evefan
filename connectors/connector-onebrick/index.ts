import onebrickClientConector from './client'
import oneBrickDef from './def'
import onebrickServerConnector from './server'

export const oneBrickProvider = {
  ...oneBrickDef,
  ...onebrickClientConector,
  ...onebrickServerConnector,
}

// codegen:start {preset: barrel, include: "./{*.{ts,tsx},*/index.{ts,tsx}}", exclude: "./**/*.{d,spec,test,fixture,gen,node}.{ts,tsx}"}
export * from './client'
export * from './def'
export * from './onebrick-utils'
export * from './OneBrickClient'
export * from './server'
// codegen:end
