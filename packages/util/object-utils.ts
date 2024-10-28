import type {DeepMergeLeafURI} from 'deepmerge-ts'
import {deepmergeCustom} from 'deepmerge-ts'
import {createCustomEqual, deepEqual} from 'fast-equals'
import {
  invert as _invert,
  isEmpty as _isEmpty,
  isPlainObject as _isPlainObject,
} from 'lodash'
import * as R from 'remeda'
import {math} from './math-utils'
import type {
  AnyRecord,
  Invert,
  NonEmptyArray,
  ObjectPartialDeep,
} from './type-utils'

export {
  circularDeepEqual,
  deepEqual,
  sameValueZeroEqual,
  shallowEqual,
} from 'fast-equals'
export {get as getAt, set as setAt} from 'shvl'

/** Defaulting null / undefined to empty object */
export const deepMerge: typeof _deepMerge = (...args) =>
  _deepMerge(...(args.map((a) => a ?? {}) as unknown as typeof args))

const _deepMerge = deepmergeCustom<{
  DeepMergeArraysURI: DeepMergeLeafURI
}>({
  mergeArrays: false,
})

export const floatingDeepEqual = createCustomEqual(
  (_deepEqual) => (a, b, meta) => {
    if (typeof a === 'number' && typeof b === 'number') {
      return math.equals(a, b)
    }
    return _deepEqual(a, b, meta)
  },
)

/**
 * Works *mostly* like https://jestjs.io/docs/expect#tomatchobjectobject
 * In particular missing value and undefined value will be considered equal,
 * So `{}` will match `{key: undefined}`
 * In practice this means there is no need to deepOmitUndefined when using
 * deepPartialDeepEqual (for the undefined cases anyways)
 */
export function deepPartialDeepEqual<
  T extends object /* Record<string, unknown> */ | unknown[],
>(
  obj: T,
  matching: ObjectPartialDeep<T>,
  opts?: {nullMatchesUndefined?: boolean},
): boolean {
  if (isPlainObject(obj) && isPlainObject(matching)) {
    for (const [key, pv] of Object.entries(matching)) {
      if (
        // @ts-expect-error
        !deepPartialDeepEqual(obj[key] as Record<string, unknown>, pv, opts)
      ) {
        return false
      }
    }
  } else if (Array.isArray(obj) && Array.isArray(matching)) {
    // Array length does matter, special case
    if (obj.length !== matching.length) {
      return false
    }
    for (let i = 0; i < matching.length; i++) {
      if (
        !deepPartialDeepEqual(
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          obj[i]! as Record<string, unknown>,
           
          matching[i],
          opts,
        )
      ) {
        return false
      }
    }
  } else if (
    opts?.nullMatchesUndefined &&
    obj === undefined &&
    matching === null
  ) {
    // Special case
    return true
  } else if (matching !== undefined) {
    if (!deepEqual(obj, matching)) {
      return false
    }
  }
  return true
}

export function isPlainObject<T extends Record<string, unknown>>(
  value: unknown | T,
): value is T {
  return _isPlainObject(value)
}

/** Mostly safe workaround. @see https://stackoverflow.com/questions/55012174/why-doesnt-object-keys-return-a-keyof-type-in-typescript */
export function objectKeys<T extends object>(obj: T): NonEmptyArray<keyof T> {
  return Object.keys(obj) as NonEmptyArray<keyof T>
}

/** Mostly safe workaround. @see https://stackoverflow.com/questions/55012174/why-doesnt-object-keys-return-a-keyof-type-in-typescript */
export function objectEntries<T extends object>(
  obj: T,
): Array<[keyof T, T[keyof T]]> {
  return Object.entries(obj) as Array<[keyof T, T[keyof T]]>
}

export function shallowOmitUndefined<T extends AnyRecord>(input: T): T {
  if (!isPlainObject(input)) {
    return input
  }
  const newObj: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) {
      continue
    }
    newObj[key] = value
  }
  return newObj as T
}

export function mapDeep<T, U = T>(
  input: T,
  fn: (value: unknown, key: string | number) => unknown,
): U {
  if (Array.isArray(input)) {
    return (input as unknown[]).map((item, i) =>
      mapDeep(fn(item, i), fn),
    ) as unknown as U
  }
  if (input && isPlainObject(input)) {
    return R.mapValues(input as Record<string, unknown>, (v, k) =>
      mapDeep(fn(v, k), fn),
    ) as unknown as U
  }
  return input as unknown as U
}

export function deepOmitUndefined<T>(
  input: T,
  opts: {
    pruneEmptyKey?: boolean
    pruneUndefinedArrayElements?: boolean
    pruneEmptyObjectProperties?: boolean
    redact?: (key: string, value: unknown) => boolean
  } = {},
): T extends undefined ? null : T {
  if (Array.isArray(input)) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return (input as unknown[])
      .filter((item) => !opts.pruneUndefinedArrayElements || item !== undefined)
      .map(
        (item) => deepOmitUndefined(item, opts),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ) as any
  }
  if (input && typeof input === 'object') {
    if (!isPlainObject(input)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
      return input as any
    }

    const newObj: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(input)) {
      if (value === undefined) {
        continue
      }
      if (opts.pruneEmptyKey && !key) {
        continue
      }
      if (opts.redact && !opts.redact(key, value)) {
        continue
      }
      const newValue = deepOmitUndefined(value, opts)
      if (
        opts.pruneEmptyObjectProperties &&
        isPlainObject(newValue) &&
        _isEmpty(newValue)
      ) {
        continue
      }
      newObj[key] = newValue
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
    return newObj as any
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
  return (input === undefined ? null : input) as any
}

// TODO: @yenbekbay How do we make the order of this consistent with
// `objectFromObject` while still remaining convenient?
export function objectFromIterable<T, U = T, K extends string = string>(
  iter: Iterable<T>,
  /** Return `undefined` to filter out */
  keySelector: (item: T, index: number) => K | undefined,
  valueSelector: (item: T, index: number) => U = (i) => i as unknown as U,
) {
  const ret = {} as Record<K, U>
  let index = 0
  for (const item of iter) {
    const key = keySelector(item, index)
    if (key != null) {
      if (key in ret) {
        console.warn(`Duplicate key ${key} during objectFromArray`)
      }
      ret[key] = valueSelector(item, index)
    }
    index++
  }
  return ret
}

export const objectFromArray = objectFromIterable

// TODO: Fix key type to be generic
export function objectFromObject<T, U = T>(
  obj: Record<string, T>,
  valueSelector: (key: string, value: T, index: number) => U,
  /** Return `undefined` to filter out */
  keySelector: (key: string, value: T, index: number) => string | undefined = (
    key,
  ) => key,
) {
  let index = 0
  const ret: Record<string, U> = {}
  for (const [key, value] of Object.entries(obj)) {
    const newKey = keySelector(key, value, index)
    if (newKey != null) {
      if (newKey in ret) {
        console.warn(
          `Duplicate key "${newKey.toString()}" during objectFromObject`,
        )
      }
      ret[newKey] = valueSelector(key, value, index)
    }
    index++
  }
  return ret
}

export function arrayFromObject<T, U = T>(
  obj: Record<string, T>,
  selector: (key: string, value: T) => U,
) {
  const items: U[] = []
  for (const key of objectKeys(obj)) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    items.push(selector(key, obj[key]!))
  }
  return items
}

/** Very useful together wth immer and optional values */
export function setDefault<T extends object, K extends keyof T>(
  obj: T,
  key: K,
  value: NonNullable<T[K]>,
): NonNullable<T[K]> {
  if (obj[key] != null) {
    return obj[key] as NonNullable<T[K]>
  }
  obj[key] = value
  return value
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function invert<T extends Record<keyof T, keyof any>>(obj: T) {
  return _invert(obj) as Invert<T>
}
