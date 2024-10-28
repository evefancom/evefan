'use client'

import {OrganizationSwitcher, useAuth, UserButton} from '@clerk/nextjs'
import NextTopLoader from 'nextjs-toploader'
import {NoSSR} from '@/components/NoSSR'
import {RedirectToNext13} from '@/components/RedirectTo'
import {VCommandBar} from '@/vcommands/vcommand-components'
import {Sidebar} from './Sidebar'

export default function AuthedLayout({children}: {children: React.ReactNode}) {
  // Clerk react cannot be trusted... Add our own clerk listener instead...
  // auth works for initial request but then subsequently breaks...
  const auth = useAuth()
  // const user = useUser()
  // const orgs = useOrganizationList()

  if (auth.isLoaded && !auth.isSignedIn) {
    return <RedirectToNext13 url="/dashboard/sign-in" />
  }

  // useEffect(() => {
  //   if (!auth.orgId && orgs.organizationList?.[0]) {
  //     void orgs.setActive(orgs.organizationList[0])
  //   }
  // }, [auth.orgId, orgs])
  // console.log('[AuthedLayout]', {user, auth, orgs})

  // return (
  //   <FullScreenCenter>
  //     <NoSSR>
  //       <OrganizationSwitcher hidePersonal defaultOpen />
  //     </NoSSR>
  //   </FullScreenCenter>
  // )
  // if (!auth.isLoaded) {
  //   // console.log('[AuthedLayout] auth not loaded', auth, orgs)
  //   return null
  // }
  // // if (!auth.isSignedIn) {
  // //   console.log('[AuthedLayout] redirect to sign in ')
  // //   return <RedirectToNext13 url="/dashboard/sign-in" />
  // // }
  // if (!orgs.isLoaded) {
  //   // console.log('[AuthedLayout] orgs not loaded', auth, orgs)
  //   return null
  // }
  // if (!auth.orgId) {
  //   const firstOrg = orgs.organizationList?.[0]
  //   return !firstOrg ? (
  //     <FullScreenCenter>
  //       <CreateOrganization />
  //     </FullScreenCenter>
  //   ) : (
  //     <EffectContainer
  //       effect={() => {
  //         // Eventually would be nice to sync active org with URL...
  //         void orgs.setActive(firstOrg)
  //       }}
  //     />
  //   )
  // }

  return (
    <div className="flex h-screen w-screen flex-col">
      <NextTopLoader showSpinner={false} />
      <VCommandBar />
      {/* max-h-[calc(100vh-3em)] should normally not be needed, but otherwise
      layout on sql page doesn't work when results are long :( donno how to prevent
      it otherwise without setting overflow hidden prop */}
      <main className="ml-[240px] mt-12 max-h-[calc(100vh-3em)] grow">
        {auth.orgId ? children : <div>Create an org to begin</div>}
      </main>
      <Sidebar className="fixed bottom-0 left-0 top-12 w-[240px] border-r bg-background" />
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
