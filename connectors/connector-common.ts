
// MARK: - New way of doing things

import {z, rxjs, Rx} from "@openint/util"

export interface EtlSource<
  TEntityMap extends Record<string, unknown> = Record<string, unknown>,
> {
  listEntities<TK extends keyof TEntityMap>(
    type: TK,
    options: {
      cursor?: string | null
      page_size?: number
    },
  ): Promise<{
    entities: Array<{
      id: string
      /** `null` means deleted */
      data: TEntityMap[TK] | null
    }>
    next_cursor: string | null
    has_next_page: boolean
  }>
}

interface CursorParser<T> {
  fromString: (cursor: string | undefined | null) => T
  toString: (value: T) => string | null
}

export const NextPageCursor: CursorParser<{next_page: number}> = {
  fromString(cursor) {
    const num = z.coerce.number().positive().safeParse(cursor)
    return {next_page: num.success ? num.data : 1}
  },
  toString(value) {
    return JSON.stringify(value)
  },
}
export function observableFromEtlSource(
  source: EtlSource,
  streams: Record<string, boolean | {disabled?: boolean | undefined} | null>,
  state: Record<string, {cursor?: string | null}> = {},
) {
  async function* iterateEntities() {
    for (const streamName of Object.keys(streams)) {
      const streamValue = streams[streamName]
      if (
        !streamValue ||
        (streamValue as {disabled: boolean}).disabled === true
        // Should further check weather streamName is valid for a given connector
      ) {
        continue
      }

      const {cursor} = state[streamName] ?? {}
      const {entities, next_cursor, has_next_page} = await source.listEntities(
        streamName,
        {cursor},
      )

      yield entities.map((j) => ({
        type: 'data' as const,
        // We should make the messages easier to construct
        data: {entityName: streamName, id: j.id, entity: j.data},
      }))

      state[streamName] = {cursor: next_cursor}
      if (!has_next_page) {
        continue
      }
    }
  }
  // DO somethign with the new state...

  return rxjs
    .from(iterateEntities())
    .pipe(Rx.mergeMap((ops) => rxjs.from([...ops, {type: 'commit' as const}])))
}
