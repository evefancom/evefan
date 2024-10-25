// import {clerkClient} from '@clerk/nextjs/server'
// import Image from 'next/image'
import {defConnectors} from '@openint/app-config/connectors/connectors.def'
import {kAccessToken} from '@openint/app-config/constants'
import {envRequired} from '@openint/app-config/env'
import type {ConnectorDef} from '@openint/cdk'
import {
  extractConnectorName,
  getViewerId,
  makeId,
  NangoConnect,
} from '@openint/cdk'
import {zConnectPageParams} from '@openint/engine-backend/router/endUserRouter'
import {makeUlid} from '@openint/util'
import {ClientRoot} from '@/components/ClientRoot'
import {SuperHydrate} from '@/components/SuperHydrate'
import {createServerComponentHelpers} from '@/lib-server/server-component-helpers'
import {SetCookieAndRedirect} from './(oauth)/redirect/SetCookieAndRedirect'
import ConnectPage from './page.client'
import {kConnectSession, type ConnectSession} from './shared'

export const metadata = {
  title: 'OpenInt Connect',
}

/**
 * Workaround for searchParams being empty on production. Will ahve to check
 * @see https://github.com/vercel/next.js/issues/43077#issuecomment-1383742153
 */
export const dynamic = 'force-dynamic'

// Should we allow page to optionally load without token for performance then add token async
// Perhaps it would even be an advantage to have the page simply be static?
// Though that would result in waterfall loading of integrations

/** https://beta.nextjs.org/docs/api-reference/file-conventions/page#searchparams-optional */
export default async function ConnectPageContainer({
  searchParams,
}: {
  // Only accessible in PageComponent rather than layout component
  // @see https://github.com/vercel/next.js/issues/43704
  searchParams: Record<string, string | string[] | undefined>
}) {
  const {token, ...params} = zConnectPageParams.parse(searchParams)
  const {ssg, getDehydratedState, viewer} = await createServerComponentHelpers({
    searchParams: {[kAccessToken]: token},
  })
  if (viewer.role !== 'end_user') {
    return (
      <div>Authenticated user only. Your role is {getViewerId(viewer)}</div>
    )
  }

  // Implement shorthand for specifying only connectorConfigId by connectorName
  let connectorConfigId = params.connectorConfigId
  if (!connectorConfigId && params.connectorName) {
    let ints = await ssg.listConnectorConfigInfos.fetch({
      connectorName: params.connectorName,
    })
    if (params.connectorConfigDisplayName) {
      ints = ints.filter(
        (int) => int.displayName === params.connectorConfigDisplayName,
      )
    }
    if (ints.length === 1 && ints[0]?.id) {
      connectorConfigId = ints[0]?.id
    } else if (ints.length < 1) {
      return (
        <div>No connector config for {params.connectorName} configured</div>
      )
    } else if (ints.length > 1) {
      console.warn(
        `${ints.length} connector configs found for ${params.connectorName}`,
      )
    }
  }

  // Special case when we are handling a single oauth connector config
  if (connectorConfigId) {
    const connectorName = extractConnectorName(connectorConfigId)
    const intDef = defConnectors[
      connectorName as keyof typeof defConnectors
    ] as ConnectorDef

    if (intDef.metadata?.nangoProvider) {
      const resourceId = makeId('reso', connectorName, makeUlid())
      const url = await NangoConnect.getOauthConnectUrl({
        public_key: envRequired.NEXT_PUBLIC_NANGO_PUBLIC_KEY,
        connection_id: resourceId,
        provider_config_key: connectorConfigId,
        // Consider using hookdeck so we can work with any number of urls
        // redirect_uri: joinPath(getServerUrl(null), '/connect/callback'),
      })
      return (
        <SetCookieAndRedirect
          cookies={[
            {
              key: kConnectSession,
              value: JSON.stringify({
                resourceId,
                token,
              } satisfies ConnectSession),
              // https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-03#section-4.1.2.7%7Cthe
              // Need sameSite to be lax in order for this to work
              options: {maxAge: 3600, sameSite: 'lax'},
            },
          ]}
          redirectUrl={url}
        />
      )
    }
  }

  await Promise.all([
    // clerkClient.organizations.getOrganization({organizationId: viewer.orgId}),
    // Switch to using react suspense / server fetch for this instead of prefetch
    ssg.listConnectorConfigInfos.prefetch({
      id: connectorConfigId,
      connectorName: params.connectorName,
    }),
    params.showExisting ? ssg.listConnections.prefetch({}) : Promise.resolve(),
  ])

  return (
    <div className="h-screen w-screen p-6">
      {/* <header className="flex items-center">
        <Image
          width={50}
          height={50}
          alt={org.slug ?? ''}
          src={org.imageUrl ?? org.logoUrl}
          className="mr-4 rounded-lg"
        />
        <h2 className="text-2xl font-semibold tracking-tight">
          {params.displayName ?? `${org.name} - ${viewer.endUserId}`}
        </h2>
      </header> */}
      <ClientRoot accessToken={viewer.accessToken} authStatus="success">
        <SuperHydrate dehydratedState={getDehydratedState()}>
          <ConnectPage {...params} />
        </SuperHydrate>
      </ClientRoot>
    </div>
  )
}
