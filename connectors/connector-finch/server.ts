import type {FinchSDK, FinchSDKTypes} from '@opensdks/sdk-finch'
import {initFinchSDK} from '@opensdks/sdk-finch'
import type {ConnectorServer} from '@openint/cdk'
import type {finchSchemas} from './def'

type Finch = FinchSDKTypes['oas']['components']['schemas']
export const finchServer = {
  // Connect

  // eslint-disable-next-line @typescript-eslint/require-await
  preConnect: async (config) => ({
    client_id: config.client_id,
    products: config.products,
  }),
  postConnect: async (connectOutput, config) => {
    const finch = initFinchSDK({
      headers: {
        'FINCH-API-VERSION': config.api_version ?? '2020-09-17',
      },
    })
    const res = await finch.POST('/auth/token', {
      params: {header: {'Content-Type': 'application/json'}},
      body: {
        client_id: config.client_id,
        client_secret: config.client_secret,
        code: connectOutput.code,
      },
    })
    const companyId =
      (res.data as Finch['GetIntrospectResponse']).company_id ??
      (await finch.GET('/introspect').then((r) => r.data.company_id))
    // TODO: figure out if accountId is needed for resourceExternalId
    // Further, do not have a constraint on resourceExternalId...
    if (!companyId) {
      throw new Error('Missing company_id for Finch')
    }
    // We should really validate at the router layer.
    return {
      resourceExternalId: companyId,
      settings: {access_token: res.data.access_token},
    }
  },
  newInstance: ({settings, config}) =>
    initFinchSDK({
      headers: {
        'FINCH-API-VERSION': config.api_version ?? '2020-09-17',
        // This is the connection specific version of the API
        // Use basic for access that is not client specific...
        authorization: `Bearer ${settings.access_token}`,
      },
    }),
  revokeResource: async (_, __, instance) => {
    await instance.POST('/disconnect')
  },
  passthrough: (instance, input) =>
    instance.request(input.method, input.path, {
      params: {query: input.query},
      headers: (() => {
        const headers = new Headers(
          (input.headers ?? {}) as Record<string, string>,
        )
        headers.delete('authorization') // We are doing our own auth
        return headers
      })(),
      body: input.body,
    }),

  // Sync

  // sourceSync: ({instance, streams, state}) => {
  //   async function* iterateRecords() {
  //     for (const stream of Object.keys(streams ?? {}).filter(
  //       (s) => !!streams[s as keyof typeof streams],
  //     )) {
  //       const sState = (state as Record<string, unknown>)[stream] ?? {}
  //       yield* iterateRecordsInStream(stream, sState)
  //     }
  //   }

  //   async function* iterateRecordsInStream(
  //     stream: string,
  //     /** stream state */
  //     sState: {cursor?: string | null},
  //   ) {
  //     const plural = finchPluralize(stream)
  //     let cursor = sState.cursor
  //     while (true) {
  //       const res = await instance.GET(`/crm/${plural as 'companies'}`, {
  //         params: {query: {cursor}},
  //       })
  //       yield res.data.results.map((com) =>
  //         helpers._opData(stream as 'company', com.id ?? '', com),
  //       )
  //       cursor = res.data.next
  //       if (!cursor) {
  //         break
  //       }
  //     }
  //   }
  //   return rxjs
  //     .from(iterateRecords())
  //     .pipe(Rx.mergeMap((ops) => rxjs.from([...ops, helpers._op('commit')])))
  // },
} satisfies ConnectorServer<typeof finchSchemas, FinchSDK>

export default finchServer
