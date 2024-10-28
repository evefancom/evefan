import {initSDK, modifyRequest} from '@opensdks/runtime'
import type {QBOSDKTypes} from '@opensdks/sdk-qbo'
import {qboSdkDef} from '@opensdks/sdk-qbo'
import type {ConnectorServer} from '@openint/cdk'
import {nangoProxyLink} from '@openint/cdk'
import {Rx, rxjs, snakeCase} from '@openint/util'
import type {QBO, qboSchemas, TransactionTypeName} from './def'
import {QBO_ENTITY_NAME, qboHelpers} from './def'

export function initQBOSdk(options: QBOSDKTypes['options']) {
  const sdk = initSDK(qboSdkDef, options)
  // TODO: Should add options to sdk itself
  return {realmId: options.realmId, ...sdk}
}

export type QBOSDK = ReturnType<typeof initQBOSdk>

export const qboServer = {
  newInstance: ({config, settings, fetchLinks}) => {
    const qbo = initQBOSdk({      
      envName: config.envName,
      realmId: settings.oauth.connection_config.realmId,
      // Access token may be out of date, we are relying on fetchLinks to contain a middleware to
      // either refresh the token or proxy the request and with its own tokens
      // Which means that in practice this is probably not gonna be used...
      accessToken: settings.oauth.credentials.access_token!,
      links: (defaultLinks) => [
        (req, next) => {
          if (qbo.clientOptions.baseUrl) {
            req.headers.set(
              nangoProxyLink.kBaseUrlOverride,
              qbo.clientOptions.baseUrl,
            )
          }
          return next(req)
        },
        (req, next) => {
          if(req.url.includes('/bank-accounts') || req.url.includes('/payment-receipts')) {
            const param = req.url.split("/").pop();
            const newUrl = req.url.includes('/bank-accounts') ? 
              req.url?.replace(/intuit\.com.*/, `intuit.com/quickbooks/v4/customers/${param}/bank-accounts`) : 
              req.url?.replace(/intuit\.com.*/, `intuit.com/quickbooks/v4/payments/receipt/${param}`);
            const newRes = modifyRequest(req, {
              url: newUrl
            });
            return next(newRes);
          }
          return next(req);
        },
        ...fetchLinks,
        ...defaultLinks
      ],
    })
    return qbo;
  },

  sourceSync: ({instance: qbo, streams}) => {
    async function* iterateEntities() {
      const updatedSince = undefined
      // TODO: Inplement incremental sync...
      console.log('[qbo] Starting sync', streams)
      for (const type of Object.values(QBO_ENTITY_NAME)) {
        if(type === 'BalanceSheet' || type === 'ProfitAndLoss') {
          // skip syncing balance sheet and profit and loss
          continue;
        }
        if (!streams[type]) {
          continue
        }
        for await (const res of qbo.getAll(type, {updatedSince})) {
          const entities = res.entities as Array<QBO[TransactionTypeName]>
          yield entities.map((t) =>
            qboHelpers._opData(snakeCase(type), t.Id, t),
          )
        }
      }
    }

    return rxjs
      .from(iterateEntities())
      .pipe(Rx.mergeMap((ops) => rxjs.from([...ops, qboHelpers._op('commit')])))
  },
} satisfies ConnectorServer<typeof qboSchemas, ReturnType<typeof initQBOSdk>>

export default qboServer
