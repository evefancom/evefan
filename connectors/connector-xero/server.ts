import {initXeroSDK} from '@opensdks/sdk-xero'
import type {ConnectorServer} from '@openint/cdk'
import {nangoProxyLink} from '@openint/cdk'
import {delay, Rx, rxjs} from '@openint/util'
import {XERO_ENTITY_NAME, xeroHelpers, type xeroSchemas} from './def'

export const xeroServer = {
  // Would be good if this was async...
  newInstance: ({settings, fetchLinks}) => {
    const xero = initXeroSDK({
      headers: {
        authorization: `Bearer ${settings.oauth.credentials.access_token}`,
      },
      links: (defaultLinks) => [
        (req, next) => {
          req.headers.set(
            nangoProxyLink.kBaseUrlOverride,
            'https://api.xero.com',
          )
          // nango's proxy endpoint is pretty annoying... Will only proxy
          // if it is prefixed with nango-proxy. Might as well not proxy like this...
          const tenantId = req.headers.get('xero-tenant-id')
          if (tenantId) {
            req.headers.delete('xero-tenant-id')
            req.headers.set('nango-proxy-xero-tenant-id', tenantId)
          }
          return next(req)
        },
        ...fetchLinks,
        ...defaultLinks,
      ],
    })
    return xero
  },
  sourceSync: ({instance: xero, streams}) => {
    console.log('[xero] Starting sync')
    async function* iterateEntities() {
      // TODO: Should handle more than one tenant Id
      const tenantId = await xero.identity
        .GET('/Connections')
        .then((r) => r.data?.[0]?.tenantId)
      if (!tenantId) {
        throw new Error(
          'Missing access to any tenants. Check xero token permission',
        )
      }
      for (const type of Object.values(XERO_ENTITY_NAME)) {
        if (!streams[type]) {
          continue
        }

        const singular = type as 'BankTransaction'
        const plural = `${singular}s` as const
        const kId = `${singular}ID` as const
        let page = 1
        while (true) {
          const result = await xero.accounting.GET(`/${plural}`, {
            params: {header: {'xero-tenant-id': tenantId}, query: {page}},
          })
          if (result.data[plural]?.length) {
            yield result.data[plural]?.map((a) =>
              xeroHelpers._opData(singular, a[kId]!, a),
            )
            // Account does not support pagination, all or nothing...
            if (type !== 'Account') {
              page++
              // Temp fix for rate limit...
              // https://developer.xero.com/documentation/guides/oauth2/limits/
              await delay(1000)
              continue
            }
          }
          break
        }
      }
    }

    return rxjs
      .from(iterateEntities())
      .pipe(
        Rx.mergeMap((ops) => rxjs.from([...ops, xeroHelpers._op('commit')])),
      )
  },
} satisfies ConnectorServer<typeof xeroSchemas, ReturnType<typeof initXeroSDK>>

export default xeroServer
