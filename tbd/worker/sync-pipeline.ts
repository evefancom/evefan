import {compact} from 'remeda'
import * as rx from 'rxjs'
import type {_PipelineExpanded} from '@openint/engine-backend/services/dbService'
import {initOpenIntSDK} from '@openint/sdk'
import type {unified} from '@openint/unified-etl'

type Source = rx.Observable<unified.Message>
type Link = (obs: Source) => Source
type Destination = Link

/** V2 sync function. How do we do flow control / back pressure? */
export async function sync({
  source,
  links = [],
  destination,
}: {
  source: Source
  links?: Link[]
  destination: Destination
}) {
  const start_millis = Date.now()
  const metrics: Record<string, number | string> = {start_millis}

  function incrementMetric(name: string, amount = 1) {
    const metric = metrics[name]
    metrics[name] = (typeof metric === 'number' ? metric : 0) + amount
    return metrics[name] as number
  }
  function setMetric<T extends string | number>(name: string, value: T) {
    metrics[name] = value
    return metrics[name] as T
  }
  await rx.lastValueFrom(
    source
      .pipe(...(links as [Link]))
      .pipe(destination)
      .pipe(
        rx.tap((m) => {
          incrementMetric(`${m.type}_count`)
        }),
      ),
    {defaultValue: undefined},
  )
  setMetric('duration_millis', Date.now() - start_millis)
  return metrics
}

/** Experimental function, not used at the moment.  */
export async function syncPipeline(pipe: _PipelineExpanded) {
  await sync({
    source: verticalSource(pipe),
    // links
    destination: verticalDestination(pipe),
  })
}

// MARK: -

export function verticalSource(pipe: _PipelineExpanded): Source {
  const sdk = initOpenIntSDK({
    headers: {'x-apikey': '', 'x-resource-id': pipe.source.id},
  })

  const srcState = (pipe.sourceState ?? {}) as Record<
    string,
    {cursor?: string | null}
  >
  const streams = compact(
    Object.entries(pipe.streams ?? {}).map(([name, stream]) =>
      !stream || stream.disabled ? null : {name, fields: stream.fields ?? []},
    ),
  )

  async function* iterateMessages() {
    for (const stream of streams) {
      const res = await sdk.GET(
        `/unified/${pipe.sourceVertical as 'crm'}/${stream.name as 'account'}`,
        {params: {query: {cursor: srcState[stream.name]?.cursor}}},
      )
      yield res.data.items.map(
        (item): unified.MessageRecord => ({
          type: 'RECORD',
          record: {stream: stream.name, data: item},
        }),
      )
    }
  }
  return rx.from(iterateMessages()).pipe(rx.mergeMap((msgs) => rx.from(msgs)))
}

// MARK: -

export function verticalDestination(pipe: _PipelineExpanded): Destination {
  const sdk = initOpenIntSDK({
    headers: {'x-apikey': '', 'x-resource-id': pipe.destination.id},
  })

  function write(msgs: unified.Message[]): Source {
    const messages = msgs.filter(
      (m): m is unified.MessageRecord => m.type === 'RECORD',
    )
    return rx
      .from(
        sdk
          .POST(`/unified/${pipe.destinationVertical as 'etl'}/write`, {
            body: {messages},
          })
          .then((r) => r.data as unified.Message[]),
      )
      .pipe(rx.mergeMap((msgs) => rx.from(msgs)))
  }

  // TODO: Obviously do some batching...
  return rx.concatMap((msg) => write([msg]))
}
