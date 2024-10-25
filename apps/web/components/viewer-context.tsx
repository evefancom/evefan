import {useAuth} from '@clerk/nextjs'
import React from 'react'
import type {Viewer} from '@openint/cdk'
import {getViewerId} from '@openint/cdk'

/** TODO This ought to be a bit more generic... */
export type AsyncStatus = 'initial' | 'loading' | 'error' | 'success'

// Maybe we can just be anonymous and initial by default?
// But it would be a bit annoying that we are not able to distinguish missing
// provider scenario
export const ViewerContext = React.createContext<
  | {
      viewer: Viewer
      status: AsyncStatus
      error?: unknown
      accessToken?: string | null
    }
  | undefined
>(undefined)

export function useViewerContext() {
  const context = React.useContext(ViewerContext)
  if (context === undefined) {
    throw new Error(
      'useViewerContext must be used within a ViewerContext.Provder',
    )
  }
  const viewerId = getViewerId(context.viewer)

  return React.useMemo(() => ({...context, viewerId}), [context, viewerId])
}

export const useCurrengOrg = () => {
  const auth = useAuth()
  if (!auth.orgId) {
    throw new Error('No current org')
  }
  return auth
}
