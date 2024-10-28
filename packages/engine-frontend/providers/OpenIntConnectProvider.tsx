import React from 'react'
import type {ConnectorClient} from '@openint/cdk'

type OpenIntConnectContext = {
  clientConnectors: Record<string, ConnectorClient>
  debug?: boolean
}

const OpenIntConnectContext = React.createContext<OpenIntConnectContext | null>(
  null,
)

export const OpenIntConnectProvider = ({
  children,
  ...ctx
}: OpenIntConnectContext & {children: React.ReactNode}) => (
  <OpenIntConnectContext.Provider value={ctx}>
    {children}
  </OpenIntConnectContext.Provider>
)

export const useOpenIntConnectContext = () => {
  const ctx = React.useContext(OpenIntConnectContext)
  if (!ctx) {
    throw new Error('useClientConnectors must be used within a OpenIntProvider')
  }
  return ctx
}

export const useOptionalOpenIntConnectContext = () => {
  const ctx = React.useContext(OpenIntConnectContext)
  return {...ctx}
}
