import {decodeTime, ulid} from 'ulidx'

export function makeUlid() {
  return ulid()
}
makeUlid.decodeTime = decodeTime

// TODO: Add converter to / from uuid.
// As ulid is 128-bit compatible with uuid
// https://github.com/ulid/spec#universally-unique-lexicographically-sortable-identifier

// MARK: - Deprecated stuff, remove me....

/** @deprecated */
export function temp_makeId<P extends string>(
  prefix: P,
  externalId: string | null | undefined,
) {
  return `${prefix}_${externalId ?? makeUlid()}` as const
}
