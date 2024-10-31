import {ClerkProvider} from '@clerk/nextjs'
// import {TRPCProvider} from '@openint/engine-frontend'
import React from 'react'
import {ClientRootWithClerk} from '@/components/ClientRoot'

export default function AdminLayout(props: {children: React.ReactNode}) {
  console.log('[AdminLayout] rendering')
  // We only get the viewer from cookies to be consistent with how it works
  // createBrowserSupabaseClient which only uses cookie and does not use header etc.

  return (
    <ClerkProvider 
      appearance={{
        elements: {
          footer: 'hidden',
          },
        }}
    >
      <ClientRootWithClerk>{props.children}</ClientRootWithClerk>
    </ClerkProvider>
  )
}
