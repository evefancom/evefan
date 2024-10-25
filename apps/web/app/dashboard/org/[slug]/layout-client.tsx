'use client'

import {
  OrganizationSwitcher,
  useAuth,
  useClerk,
  UserButton,
} from '@clerk/nextjs'
import {useRouter} from 'next/navigation'
import React from 'react'
import {LoadingText} from '@openint/ui'
import {NoSSR} from '@/components/NoSSR'
import {RedirectToNext13} from '@/components/RedirectTo'

// import {Sidebar} from './Sidebar'

export default function OrgLayoutClient({
  children,
  orgId,
  orgSlug,
}: {
  children: React.ReactNode
  orgId: string
  orgSlug: string
}) {
  // Clerk react cannot be trusted... Add our own clerk listener instead...
  // auth works for initial request but then subsequently breaks...
  const auth = useAuth()
  const clerk = useClerk()
  const router = useRouter()
  const clerkReady = clerk.loaded
  // The issue is that we do not control org switcher... We would need to hook in there to change the url
  const [ready, setReady] = React.useState(orgId === auth.orgId)

  // Update client session for server side org change (triggered by url update)
  React.useEffect(() => {
    // Need the check for !ready otherwise causes infinite loop
    // Don't fully understand the logic yet though
    if (orgId !== auth.orgId && !ready && clerkReady) {
      clerk
        .setActive({organization: orgId})
        .then(() => setReady(true))
        .catch((err) => {
          console.error('[OrgLayout] error setting active org', err)
        })
    }
  }, [auth.orgId, clerk, clerkReady, orgId, ready])

  // Update url when client side changes org
  React.useEffect(() => {
    const listener = clerk.addListener((event) => {
      const newSlug = event.organization?.slug
      console.log('event', newSlug, event)
      if (newSlug && newSlug !== orgSlug) {
        router.push(`/org/${newSlug}`)
      }
    })
    return listener
  })

  if (!ready) {
    return (
      <LoadingText className="block p-4" text={`Switching to ${orgSlug}`} />
    )
  }

  if (auth.isLoaded && !auth.isSignedIn) {
    return <RedirectToNext13 url="/dashboard/sign-in" />
  }

  return (
    <div className="flex h-screen w-screen flex-col">
      <main className="ml-[240px] mt-12">
        <h2>Your slug in url {orgSlug}</h2>
        <h2>Your slug in auth {auth.orgSlug}</h2>
        {auth.orgId ? children : <div>Create an org to begin</div>}
      </main>
      {/* <Sidebar className="fixed bottom-0 left-0 top-12 w-[240px] border-r bg-background" /> */}
      <header className="fixed inset-x-0 top-0 flex h-12 items-center gap-2 border-b bg-background p-4">
        {/* Not working because of bug in clerk js that is unclear that results in hydration issue.. */}
        <NoSSR>
          <div className="mb-[-6px]">
            {/* Compensate for mysterious 6px bottom padding not explainable */}
            <OrganizationSwitcher hidePersonal />
          </div>
          {/* <TopLav /> */}
          <div className="grow" /> {/* Spacer */}
          <UserButton showName />
        </NoSSR>
      </header>
    </div>
  )
}
