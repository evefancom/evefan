import type {ConnectorServer} from '@openint/cdk'
import {firebaseServer, serializeTimestamp} from '@openint/connector-firebase'
import {Rx, rxjs} from '@openint/util'
import type {foreceiptSchemas} from './def'
import {foreceiptHelpers} from './def'
import {makeForeceiptClient} from './ForeceiptClient'

export const foreceiptServer = {
  // TODO: Need to check and fix the issue
  // postConnect: async (input, config) => {
  //   const settings = foreceiptHelpers._type('resourceSettings', {
  //     ...input,
  //   })
  //   const source$: rxjs.Observable<ForeceiptSyncOperation> =
  //     foreceiptProvider.sourceSync({settings, config, options: {}})

  //   return {
  //     externalId: `${input._id}`,
  //     settings,
  //     source$,
  //   }
  // },

  sourceSync: ({settings}) => {
    const client = makeForeceiptClient({...settings})
    const getInfo = client.getInfo
    let info: Awaited<ReturnType<typeof getInfo>>
    const raw$ = rxjs.of(client.initFb()).pipe(
      Rx.mergeMap((fb) => {
        console.log(client.fbSettings, '===firebase init ===')
        return rxjs
          .from(client.getQuery$())
          .pipe(
            Rx.mergeMap(([q, res]) => {
              info = res
              return firebaseServer.sourceSync({
                endUser: null,
                config: {},
                settings: client.fbSettings,
                state: {_fb: fb, _queries: Object.values(q)},
                streams: {},
                instance: undefined, // Not implemented by firebaseServer yet...
              })
            }),
          )
          .pipe(
            // Hack it with concatMap
            // TODO: Need to get better understanding of rxjs by re-read references from @tony's, concatMap is very slow, but also cannot use the mergeMap. Need check another map
            // Or we should cache the http request
            Rx.mergeMap((op) => {
              const r =
                op.type === 'data' && op.data.entityName === 'Receipts'
                  ? (op.data.entity as Foreceipt.Receipt)
                  : null
              return rxjs.of(
                op.type !== 'data'
                  ? foreceiptHelpers._op('commit')
                  : foreceiptHelpers._op('data', {
                      data:
                        op.data.entityName === 'Receipts'
                          ? {
                              id: r?.content.id ?? op.data.id,
                              entity: {
                                ...r,
                                _docId: op.data.id,
                                create_time: serializeTimestamp(
                                  r?.create_time as FirebaseFirestore.Timestamp,
                                ),
                                last_update_time: serializeTimestamp(
                                  r?.last_update_time as FirebaseFirestore.Timestamp,
                                ),
                              } as Foreceipt.Receipt,
                              entityName: 'transaction',
                              info,
                            }
                          : {
                              id: op.data.id,
                              entity: op.data.entity as Foreceipt.Account,
                              entityName: 'account',
                              info,
                            },
                    }),
              )
            }),
          )
      }),
    )

    return raw$.pipe(Rx.mergeMap((op) => rxjs.of(op)))
  },
} satisfies ConnectorServer<typeof foreceiptSchemas>

export default foreceiptServer
