import tellerClient from './client'
import tellerDef from './def'
import tellerServer from './server'

export const tellerProvider = {
  ...tellerDef,
  ...tellerClient,
  ...tellerServer,
}

// codegen:start {preset: barrel, include: "./{*.{ts,tsx},*/index.{ts,tsx}}", exclude: "./**/*.{d,spec,test,fixture,gen,node}.{ts,tsx}"}
export * from './client'
export * from './def'
export * from './server'
export * from './TellerClient'
// codegen:end
