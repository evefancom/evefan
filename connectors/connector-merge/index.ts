import {mergeClient} from './client'
import {mergeDef} from './def'
import {mergeServer} from './server'

export const mergeImpl = {
  ...mergeDef,
  ...mergeClient,
  ...mergeServer,
}

// codegen:start {preset: barrel, include: "./{*.{ts,tsx},*/index.{ts,tsx}}", exclude: "./**/*.{d,spec,test,fixture,types,gen}.{ts,tsx}"}
export * from './client'
export * from './def'
export * from './merge-logo.svg'
export * from './server'
// codegen:end
