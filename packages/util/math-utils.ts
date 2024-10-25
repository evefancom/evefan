import Decimal from 'decimal.js'
import {sum} from 'lodash'

/**
 * Should handle cases like math.equal(6.65 - 3.32 - 3.33, 0)
 *
 * Largest numbers we saw so far
 * 3.725290298461914e-9 (BCA)
 * 9.313225746154785e-10 (BCA)
 * 2.9103830456733704e-11 (FRB Checking)
 *
 */
export const DBL_EPSILON = 1e-8

export function isNegative(num: number) {
  return num <= DBL_EPSILON * -1
}

export function isPositive(num: number) {
  return num >= DBL_EPSILON
}

export function isZero(num: number) {
  return Math.abs(num) < DBL_EPSILON
}

export function isNonZero(num: number) {
  return !isZero(num)
}

export function isNegativeZero(num: number) {
  return num === 0 && 1 / num === Number.NEGATIVE_INFINITY
}

/**
 * Uses Decimal to be safe.
 * > new Decimal('-250003747.5').round()
 * -250003748
 * > Math.round(-250003747.5)
 * -250003747
 */
export function round(num: number, decimals: number) {
  const factor = 10 ** decimals
  return new Decimal(num * factor).round().div(factor).toNumber()
  // return Math.round(num * factor) / factor
}

/**
 * Workaround for issue where `math.equal(6.65 - 3.32 - 3.33, 0) === false`
 * https://github.com/josdejong/mathjs/issues/1614
 */
export function equals(n1: number, n2: number) {
  return Math.abs(n1 - n2) <= DBL_EPSILON
}

// Based on https://stackoverflow.com/a/27865285
export function precision(num: number) {
  if (!Number.isFinite(num)) {
    return 0
  }
  let e = 1
  let p = 0
  while (Math.round(num * e) / e !== num) {
    e *= 10
    p++
  }
  return p
}

export function signOf(num: number): 1 | -1 | 0 {
  return num > 0 ? 1 : num < 0 ? -1 : 0
}

export const math = {
  equals,
  DBL_EPSILON,
  isNegative,
  isPositive,
  isZero,
  isNonZero,
  isNegativeZero,
  round,
  sum,
  precision,
  signOf,
}
