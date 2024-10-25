import React from 'react'
import type {PlaidLinkOptions} from 'react-plaid-link'
import {usePlaidLink} from 'react-plaid-link'
import type {ConnectorClient} from '@openint/cdk'
import {CANCELLATION_TOKEN} from '@openint/cdk'
import type {RequiredOnly} from '@openint/util'
import {Deferred} from '@openint/util'
import type {helpers, plaidSchemas} from './def'

export const plaidClientConnector = {
  useConnectHook: (_) => {
    const [state, setState] = React.useState<{
      options: RequiredOnly<PlaidLinkOptions, 'token'>
      res$: Deferred<(typeof helpers)['_types']['connectOutput']>
    } | null>(null)

    const plaidLink = usePlaidLink({
      token: null, // Null token prevent plaid from showing the UI but still allows script to be loaded for performance
      ...state?.options,
      // token: 'link-sandbox-49a06045-6ef6-4dfd-ab9a-33dc6380513d',
      // webhook: 'https://6b90-118-99-92-111.ngrok.io/api/webhook/plaid',
      // oauthRedirectUri: 'http://localhost:3000',
      onLoad: () => {
        console.log('[plaid] onLoad')
      },
      onEvent: (event, meta) => {
        console.log('[plaid] onEvent', event, meta)
      },
      onSuccess: (publicToken, meta) => {
        console.log('[plaid] onSuccess', {publicToken, meta})
        state?.res$.resolve({publicToken, meta})
        setState(null)
      },
      onExit: (err) => {
        console.log('[plaid] onExit', err)
        state?.res$.reject(err ?? CANCELLATION_TOKEN)
        setState(null)
      },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    ;(globalThis as any).plaidLink = plaidLink

    const {open, ready} = plaidLink

    React.useEffect(() => {
      console.log('[plaid] useEffect may open', {ready, state})
      if (ready && state) {
        console.log('[plaid] Will open')
        open() // Unfortunately open gets called multiple times due to unmounting.
        // It is a bit of a no-op though, so we should be fine...
      }
      return () => {
        console.log('[plaid] useEffect did cleanup...')
      }
    }, [open, ready, state])

    return async (opts, {integrationExternalId}) => {
      console.log('[plaid] Will connect', opts, plaidLink)
      if ('public_token' in opts) {
        return {publicToken: opts.public_token}
      }
      if (plaidLink.error) {
        // eslint-disable-next-line @typescript-eslint/no-throw-literal
        throw plaidLink.error
      }
      // TODO: Implement a dialog fallback to tell user to search for the needed
      // institution in the next screen to work around the problem that
      // plaid does not support instiutionId
      if (integrationExternalId) {
        console.warn('[plaid] integrationExternalId not handled', {
          integrationExternalId,
        })
      }
      const res$ = new Deferred<(typeof helpers)['_types']['connectOutput']>()
      setState({options: {token: opts.link_token}, res$})
      return res$.promise
    }
  },
} satisfies ConnectorClient<typeof plaidSchemas>

export default plaidClientConnector
