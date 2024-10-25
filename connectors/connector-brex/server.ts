/** Used for the side effect of window.MergeLink */
import initBrexSDK from '@opensdks/sdk-brex'
import type {ConnectorServer} from '@openint/cdk'
import {Rx, rxjs} from '@openint/util'
import type {brexSchemas} from './def'
import {helpers} from './def'

export const brexServer = {
  sourceSync: ({settings}) => {
    const brex = initBrexSDK({
      headers: {authorization: `Bearer ${settings.accessToken}`},
    })

    // TODO: Paginate obviously
    return rxjs
      .from(
        brex.transactions
          .GET('/v2/transactions/card/primary', {})
          .then(
            (res) =>
              (res.data.items ?? [])?.map((txn) =>
                helpers._opData('transaction', txn.id ?? '', txn),
              ),
          ),
      )
      .pipe(Rx.mergeMap((ops) => rxjs.from(ops)))
  },
} satisfies ConnectorServer<typeof brexSchemas>

export default brexServer
