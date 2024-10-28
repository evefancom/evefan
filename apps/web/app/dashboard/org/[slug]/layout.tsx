import {clerkClient, auth as serverComponentGetAuth} from '@clerk/nextjs/server'
import {notFound} from 'next/navigation'
import OrgLayoutClient from './layout-client'

export default async function OrgLayout({
  children,
  params: {slug},
}: {
  children: React.ReactNode
  params: {slug: string}
}) {
  const auth = serverComponentGetAuth()

  // TODO: Handle edge cases, such as
  // Org deleted but still in token
  // User exists but user does not have permission to this
  const orgId =
    auth.orgSlug === slug
      ? auth.orgId
      : // would be nice to cache this in server components too
        await clerkClient.organizations
          .getOrganization({slug})
          .then((o) => o.id)
          .catch((err) => {
            // TODO: Figure out a better way to handle this
            if (`${err}`.includes('Not Found')) {
              return null
            }
            throw err
          })

  if (!orgId) {
    return notFound()
  }

  return (
    <OrgLayoutClient orgId={orgId} orgSlug={slug}>
      {children}
    </OrgLayoutClient>
  )
}
