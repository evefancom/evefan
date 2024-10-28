import brexDef from './def'
import brexServer from './server'

export const brexImpl = {
  ...brexDef,
  ...brexServer,
}

// codegen:start {preset: barrel, include: "./{*.{ts,tsx},*/index.{ts,tsx}}", exclude: "./**/*.{d,spec,test,fixture,types,gen}.{ts,tsx}"}
export * from './def'
export * from './server'
// codegen:end
