import type {MicroMemoize as Memoize} from 'micro-memoize'
import memoize from 'micro-memoize'

import type {AnyFunction} from './type-utils'

export function memoizeBy<TFunc extends AnyFunction>(
  func: TFunc,
  isMatchingKey?: (prev: Parameters<TFunc>, next: Parameters<TFunc>) => boolean,
  opts?: Memoize.StandardOptions,
) {
  return memoize(func, {
    maxSize: Number.POSITIVE_INFINITY,
    isMatchingKey: isMatchingKey as Memoize.MatchingKeyComparator,
    ...opts,
  })
}

export function catchAsNull<T>(fn: () => T | null) {
  try {
    return fn()
  } catch {
    return null
  }
}

export {default as memoize} from 'micro-memoize'
