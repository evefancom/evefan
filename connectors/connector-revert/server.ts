import type {RevertSDK} from '@opensdks/sdk-revert'
import {initRevertSDK} from '@opensdks/sdk-revert'
import type {ConnectorServer} from '@openint/cdk'
import {Rx, rxjs} from '@openint/util'
import type {revertSchemas} from './def'
import {helpers} from './def'

export const revertServer = {
  newInstance: ({settings, config}) =>
    initRevertSDK({
      headers: {
        'x-revert-api-token': config.api_token,
        'x-api-version': config.api_version,
        'x-revert-t-id': settings.tenant_id,
      },
    }),
  sourceSync: ({instance, state, streams}) => {
    async function* iterateRecords() {
      for (const [name, _stream] of Object.entries(streams ?? {})) {
        const stream =
          typeof _stream === 'boolean' ? {disabled: _stream} : _stream
        if (!stream || stream.disabled) {
          continue
        }
        const sState = ((state ?? {}) as Record<string, unknown>)[name] ?? {}
        yield* iterateRecordsInStream(name, stream.fields ?? [], sState) // TODO(@jatin): update this.
      }
    }

    async function* iterateRecordsInStream(
      stream: string,
      /** stream state */
      fields: string[],
      sState: {cursor?: string | null},
    ) {
      const plural = revertPluralize(stream)
      let cursor = sState.cursor
      while (true) {
        // @jatinsandilya don't worry about making this work for incremental sync
        // Our requirement so far is just one time import for now
        const res = await instance.GET(`/crm/${plural as 'companies'}`, {
          params: {query: {cursor, fields: fields.join(',')}},
        })

        yield res.data.results.map((com) =>
          helpers._opData(stream as 'company', com.id ?? '', com),
        )

        cursor = res.data.next
        if (!cursor) {
          break
        }
      }
    }
    return rxjs
      .from(iterateRecords())
      .pipe(Rx.mergeMap((ops) => rxjs.from([...ops, helpers._op('commit')])))
  },

  proxy: (instance, req) => {
    const url = new URL(req.url)
    const prefix = url.protocol + '//' + url.host + '/api/proxy'
    // TODO: Add a .fetch function to the http client.
    return instance
      .request(req.method as 'GET', req.url.replace(prefix, ''), req)
      .then((r) => r.response)
  },
  passthrough: (instance, input) =>
    instance.request(input.method, input.path, {
      params: {query: input.query},
      headers: new Headers((input.headers ?? {}) as Record<string, string>),
      body: input.body,
    }),
} satisfies ConnectorServer<typeof revertSchemas, RevertSDK>

export default revertServer

function revertPluralize(word: string) {
  // Apply basic pluralization rules
  if (
    word.endsWith('s') ||
    word.endsWith('ch') ||
    word.endsWith('sh') ||
    word.endsWith('x') ||
    word.endsWith('z')
  ) {
    return word + 'es'
  } else if (
    word.endsWith('y') &&
    !['a', 'e', 'i', 'o', 'u'].includes(word.charAt(word.length - 2))
  ) {
    return word.slice(0, -1) + 'ies'
  } else {
    return word + 's'
  }
}
