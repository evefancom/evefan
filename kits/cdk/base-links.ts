import type {
  AnyEntityPayload,
  Link,
  ResoUpdateData,
  StateUpdateData,
  SyncOperation,
} from '@openint/sync'
import type {WritableDraft} from '@openint/util'
import {produce, R, Rx, rxjs, snakeCase} from '@openint/util'
import type {Id} from './id.types'

type Data = AnyEntityPayload
type OperationType = SyncOperation['type']
export type OpHandlers<
  TRet,
  T extends Data = Data,
  TResoUpdate extends object = ResoUpdateData,
  TStateUpdate extends object = StateUpdateData,
> = Partial<{
  [k in OperationType]: (
    op: Extract<SyncOperation<T, TResoUpdate, TStateUpdate>, {type: k}>,
  ) => TRet | Promise<TRet>
}>

/**
 * If handler returns void, we will return rxjs.EMPTY. Uses concatMap to respect input order
 * Consider using zod for runtime typechecking here
 */
export function handlersLink<
  TData extends Data,
  TResoUpdate extends object = ResoUpdateData,
  TStateUpdate extends object = StateUpdateData,
>(
  handlers: OpHandlers<
    rxjs.ObservableInput<SyncOperation<TData>> | void,
    TData,
    TResoUpdate,
    TStateUpdate
  >,
): Link<TData> {
  // Order is important by default. mergeMap would result in `ready` being fired before
  // file has been written to disk as an example. Use mergeMap only if perf or a special
  // reason justifies it and order doesn't matter
  // @ts-expect-error as it could return a promise which is natively handled by RxJS but not TS
  return Rx.concatMap((op) =>
    R.pipe(handlers[op.type], (h) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      h ? h(op as any) ?? rxjs.EMPTY : rxjs.of(op),
    ),
  )
}
export function transformLink<T extends Data>(
  transform: (op: WritableDraft<SyncOperation<T>>) => SyncOperation<T> | void,
): Link<T> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
  return Rx.map((op) => produce(op, transform as any))
}

export function logLink<T extends Data>(
  opts: {prefix?: string; verbose?: boolean | number} = {},
): Link<T> {
  let i = 0
  return Rx.tap((op) => {
    console.log(
      R.compact([
        `[logLink #${i}]`,
        opts.prefix && `${opts.prefix}:`,
        `type=${op.type}`,
        op.type === 'data' && `${op.data.entityName}/${op.data.id}`,
        op.type === 'resoUpdate' && `op.id=${op.id}`,
      ]).join(' '),
    )
    if (opts.verbose !== undefined) {
      console.dir(op, {
        depth: typeof opts.verbose === 'number' ? opts.verbose : null,
      })
    }
    i++
  })
}

export function mergeReady<T extends AnyEntityPayload>(len: number): Link<T> {
  let i = 0
  return Rx.mergeMap((op) => {
    if (op.type === 'ready') {
      i++
      if (i < len) {
        return rxjs.EMPTY
      } else if (i > len) {
        // Should never happen, but...
        throw new Error('Duplicate ready events detected')
      } else {
        console.log(`[mergeReady] Overall ready from ${len} systems`)
      }
    }
    return rxjs.of(op)
  })
}

export function prefixConnectorNameLink(ctx: {
  source: {
    id: Id['reso']
    connectorConfig: {connectorName: string}
    metadata?: unknown
  }
}): Link<AnyEntityPayload, AnyEntityPayload> {
  return Rx.mergeMap((op) => {
    if (op.type !== 'data') {
      return rxjs.of(op)
    }

    op.data.entityName = `${ctx.source.connectorConfig.connectorName}_${op.data.entityName}`
    return rxjs.of(op)
  })
}

export function singleTableLink(_ctx: {
  source: {
    id: Id['reso']
    connectorConfig: {connectorName: string}
    metadata?: unknown
  }
}): Link<AnyEntityPayload, AnyEntityPayload> {
  return Rx.mergeMap((op) => {
    if (op.type !== 'data') {
      return rxjs.of(op)
    }

    op.data.id = `${op.data.entityName}_${op.data.id}`
    op.data.entityName = 'synced_data'
    return rxjs.of(op)
  })
}

export function agColumnRenameLink(_ctx: {
  source: {
    id: Id['reso']
    connectorConfig: {connectorName: string}
    metadata?: unknown
  }
}): Link<AnyEntityPayload, AnyEntityPayload> {
  return Rx.mergeMap((op) => {
    if (op.type !== 'data') {
      return rxjs.of(op)
    }

    const entityMappings = {
      // Greenhouse
      job: 'IntegrationAtsJob',
      candidate: 'IntegrationAtsCandidate',
      opening: 'IntegrationAtsJobOpening',
      offer: 'IntegrationAtsOffer',
      // Lever
      // already mapped above, same relation name
      // offer: 'IntegrationAtsOffer',

      // there's no list contacts endpoint in lever
      // contact: 'IntegrationAtsCandidate',

      // maybe we should not sync opportunities at all as we're mapping it to the same candidate table
      opportunity: 'IntegrationAtsCandidate',
      
      posting: 'IntegrationAtsJob',
      // TODO, perhaps map requisitions to IntegrationAtsJobOpening?
    }

    op.data.entityName = entityMappings[snakeCase(op.data.entityName) as keyof typeof entityMappings] ?? op.data.entityName

    return rxjs.of(op)
  })
}
