import type {
  Json,
  MaybePromise,
  NoInfer,
  ObjectPartialDeep,
} from '@openint/util'
import {R, z} from '@openint/util'

/** @deprecated. See metaService. */
export interface KVStore<T = Json> {
  get(id: string): MaybePromise<T | null | undefined>
  list(): MaybePromise<ReadonlyArray<readonly [string, T]>>

  /** `null` to delete */
  set(id: string, data: T | null): MaybePromise<void>
  // Deep partial really
  patch?(id: string, data: ObjectPartialDeep<NoInfer<T>>): MaybePromise<void>

  // Do we need these? If so introduce soon
  // delete?(id: string): MaybePromise<void>
  commit?(): Promise<void>
  /** Clean up any resources, disconnect... */
  close?(): Promise<unknown>
}

export const zKVStore = z.custom<KVStore<Record<string, unknown>>>()

/** Technically does not belong in FS, but we also don't have a good place for it for now... */
export function makeMemoryKVStore<T>(): KVStore<T> {
  const cache: Record<string, T> = {}
  return {
    get: (id) => cache[id],
    list: () => R.toPairs(cache),
    set: (id, data) => {
      if (!data) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete cache[id]
      } else {
        cache[id] = data
      }
    },
  }
}
