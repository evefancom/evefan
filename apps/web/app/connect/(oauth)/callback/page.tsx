import '@openint/app-config/register.node'
import {cookies} from 'next/headers'
import {redirect} from 'next/navigation'
import {kAccessToken} from '@openint/app-config/constants'
import {envRequired} from '@openint/app-config/env'
import type {Id} from '@openint/cdk'
import {initNangoSDK, NangoConnect} from '@openint/cdk'
import type {FrameMessage} from '@openint/connect'
import {FullScreenCenter} from '@/components/FullScreenCenter'
import {serverSideHelpersFromViewer} from '@/lib-server'
import {serverComponentGetViewer} from '@/lib-server/server-component-helpers'
import {kConnectSession, zConnectSession} from '../../shared'
import {CallbackEffect} from './CallbackEffect'

export const metadata = {
  title: 'Venice Oauth Callback',
}

/**
 * Workaround for searchParams being empty on production. Will ahve to check
 * @see https://github.com/vercel/next.js/issues/43077#issuecomment-1383742153
 */
export const dynamic = 'force-dynamic'

/** https://beta.nextjs.org/docs/api-reference/file-conventions/page#searchparams-optional */
export default async function ConnectCallback({
  searchParams,
}: {
  // Only accessible in PageComponent rather than layout component
  // @see https://github.com/vercel/next.js/issues/43704
  searchParams: Record<string, string | string[] | undefined>
}) {
  // TODO: Can we use cookies-next to read cookie in this environment?
  const cookie = cookies().get(kConnectSession)
  if (!cookie) {
    // Temporary hack to redirect to the right place to accomodate for oauth url not fully changed yet
    const url = new URL('https://app.venice.is/connect/callback')
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.append(key, value as string)
    }
    return redirect(url.toString())
  }

  const msg = await (async (): Promise<FrameMessage | null> => {
    try {
      const res = await NangoConnect.doOauthCallback(searchParams)

      if (!res) {
        // This means that we are using the @nango/frontend websocket client...
        return null
      }

      if (!cookie) {
        return {
          type: 'ERROR',
          data: {code: 'BAD_REQUEST', message: 'No session found'},
        }
      }

      if (res.eventType !== 'AUTHORIZATION_SUCEEDED') {
        return {
          type: 'ERROR',
          data: {code: res.data.authErrorType, message: res.data.authErrorDesc},
        }
      }
      const session = zConnectSession.parse(JSON.parse(cookie.value))
      const viewer = await serverComponentGetViewer({
        searchParams: {[kAccessToken]: session.token},
      })

      const resourceId = res.data.connectionId as Id['reso']
      if (session.resourceId !== resourceId) {
        console.warn('Revoking due to unmatched resourceId')
        const nango = initNangoSDK({
          headers: {authorization: `Bearer ${envRequired.NANGO_SECRET_KEY}`},
        })
        await nango.DELETE('/connection/{connectionId}', {
          params: {
            path: {connectionId: res.data.connectionId},
            query: {provider_config_key: res.data.providerConfigKey},
          },
        })
        return {
          type: 'ERROR',
          data: {
            code: 'FORBIDDEN',
            message: `Session resourceId (${session.resourceId}) not matching connected resourceId ${resourceId}`,
          },
        }
      }

      const {caller} = serverSideHelpersFromViewer(viewer)
      await caller.postConnect([res.data, res.data.providerConfigKey, {}])
      return {
        type: 'SUCCESS',
        data: {resourceId: res.data.connectionId as Id['reso']},
      }
    } catch (err) {
      console.error('[oauth] Error during connect', err)
      return {
        type: 'ERROR',
        data: {code: 'INTERNAL_SERVER_ERROR', message: `${err}`},
      }
    }
  })()

  console.log('[oauth] callback result', msg)

  // How do we do redirect here?
  return (
    <FullScreenCenter>
      {msg && (
        <>
          <span className="mb-2">{msg.type} </span>
          <span className="mb-2">
            {msg.type === 'ERROR'
              ? `[${msg.data.code}] ${msg.data.message}`
              : msg.data.resourceId}
          </span>
        </>
      )}
      <CallbackEffect msg={msg} autoClose={!msg} />
    </FullScreenCenter>
  )
}
