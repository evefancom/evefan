import * as R from 'remeda'
import accounting from 'accounting'
import {sort} from 'fast-sort'
import invariant from 'tiny-invariant'

import {math} from './math-utils'
import {objectFromIterable, objectFromObject} from './object-utils'

export type AnyAmount = Amount | AmountMap | MultiAmount | Amount[]

export interface Amount {
  unit: Unit
  quantity: number
  meta?: AmountMeta
}

export interface AmountMeta {
  color?: string
}

/**
 * Map from unit -> quantity
 * TODO: Turn me into the new MultiAmount?
 * TODO: Should this be ReadOnly to reduce mistake?
 */
export type AmountMap = Record<string, number>

export interface MultiAmount {
  amounts: Amount[]
}

// MARK: - Multi-unit AmountMap

export const AM = (am: Record<string, number>): AmountMap => am

/** For storing meta symbol on amount */
AM.meta = Symbol('meta')

/** For speed optimization. Prefer `Am.add`  */
AM.incrInPlace = (am: AmountMap, a: Amount) => {
  am[a.unit] = (am[a.unit] ?? 0) + a.quantity
  return am
}

/** For speed optimization. Prefer `Am.subtract` */
AM.decrInPlace = (am: AmountMap, a: Amount) => {
  AM.incrInPlace(am, A.invert(a))
  return am
}

// TODO: Figure out how to use Immer / Object.freeze to help ensure immutability
// Should be the default case and mutable should be a special variant
// Both Amount and AmountMap should be frozen by default
// TODO: Introduce `MutableAmount` and `MutableAmountMap` for performance
// optimization purposes

AM.add = (a1: AmountMap, a2: AmountMap, ...addl: AmountMap[]): AmountMap => {
  const ret = objectFromIterable(
    new Set([...Object.keys(a1), ...Object.keys(a2)]),
    (unit) => unit,
    (unit) => (a1[unit] ?? 0) + (a2[unit] ?? 0),
  )
  if (addl.length === 0) {
    return ret
  }
  const [next, ...rest] = addl as [
    Record<string, number>,
    ...Array<Record<string, number>>,
  ]
  return AM.add(ret, next, ...rest)
}

AM.subtract = (a1: AmountMap, a2: AmountMap, ...addl: AmountMap[]) =>
  AM.add(a1, AM.invert(a2), ...addl.map(AM.invert))

AM.invert = (a: AmountMap): AmountMap =>
  objectFromObject(a, (_, quantity) => -1 * quantity)

AM.equals = (a1: AmountMap, a2: AmountMap) => {
  const units = new Set([...Object.keys(a1), ...Object.keys(a2)])
  for (const unit of units) {
    if (!math.equals(a1[unit] ?? 0, a2[unit] ?? 0)) {
      return false
    }
  }
  return true
}

AM.toAmounts = (am: AmountMap) => Object.entries(am).map(([k, v]) => A(v, k))

AM.toAmountOrFail = (am: AmountMap) => {
  const amounts = AM.toAmounts(am)
  if (amounts.length !== 1) {
    throw new Error(
      `Unable to unambiguously convert AmountMap to amount. Got ${amounts.length} amounts`,
    )
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return amounts[0]!
}

AM.omitZeros = (am: AmountMap): AmountMap =>
  objectFromObject(
    am,
    (_, v) => v,
    (k, v) => (math.equals(v, 0) ? undefined : k),
  )

AM.isZero = (am: AmountMap) => AM.equals(am, {})

AM.sum = (...amounts: Amount[]) => {
  const am: AmountMap = {}
  for (const a of amounts) {
    AM.incrInPlace(am, a)
  }
  return am
}

// MARK: - Single-unit Amount

export const A = (
  quantity: number,
  unit: string,
  meta?: AmountMeta,
): Amount => ({
  quantity,
  unit: unit as Unit,
  ...(meta && {meta}),
})

A.setQuantity = (a: Amount, quantity: number) => A(quantity, a.unit)

A.equals = (a: Amount, b: Amount) =>
  a.unit === b.unit && math.isZero(a.quantity - b.quantity)

A.multiEquals = (a1: MultiAmount, a2: MultiAmount) => {
  const hasUnequalAmount = R.zip(
    sort(a1.amounts).asc('unit'),
    sort(a2.amounts).asc('unit'),
  ).some(([a1a, a2a]) => (a1a && a2a ? !A.equals(a1a, a2a) : true))
  return !hasUnequalAmount
}

A.subtract = (a: Amount, b: Amount) => {
  if (a.unit !== b.unit) {
    throw new Error('Cannot operate on amounts with wrong units')
  }
  return A(a.quantity - b.quantity, a.unit)
}

A.add = (a: Amount, b: Amount) => {
  if (a.unit !== b.unit) {
    throw new Error('Cannot operate on amounts with wrong units')
  }
  return A(a.quantity + b.quantity, a.unit)
}

A.divide = (a: Amount, x: number) => A(a.quantity / x, a.unit)

A.multiply = (a: Amount, x: number) => A(a.quantity * x, a.unit)

A.isZero = (a: Amount) => math.isZero(a.quantity)

A.invert = (a: Amount) => A(a.quantity * -1, a.unit)

A.invertMap = (a: AmountMap): AmountMap =>
  objectFromObject(a, (_, quantity) => quantity * -1)

A.abs = (a: Amount) => A(Math.abs(a.quantity), a.unit)

A.splitNearEqually = (amount: Amount, shares: number, precision = 2) => {
  invariant(Number.isInteger(shares) && shares > 0)
  const quantity = math.round(amount.quantity / shares, precision)

  const amounts: Amount[] = []

  let remaining = amount.quantity
  for (let i = shares; i > 0; i--) {
    if (Math.abs(remaining) > Math.abs(quantity) && i > 1) {
      amounts.push(A(quantity, amount.unit))
    } else {
      amounts.push(A(remaining, amount.unit))
    }
    remaining -= quantity
  }

  return amounts
}

A.omitZeros = (amount: MultiAmount): MultiAmount => ({
  ...amount,
  amounts: amount.amounts.filter((a) => !math.isZero(a.quantity)),
})

// MARK: - Helpers

export function isSimpleAmount(amount: AnyAmount): amount is Amount {
  return 'unit' in amount && typeof amount.unit === 'string'
}

export function isMultiAmount(amount: AnyAmount): amount is MultiAmount {
  return 'amounts' in amount && Array.isArray(amount.amounts)
}

export function isAmountMap(amount: AnyAmount): amount is AmountMap {
  return !isSimpleAmount(amount) && !isMultiAmount(amount)
}

/** Should be on `AM` instead */
export function toAmountMap(amount: AnyAmount | null | undefined): AmountMap {
  if (!amount) {
    return {}
  }
  if (Array.isArray(amount)) {
    const am: AmountMap = {}
    for (const a of amount) {
      AM.incrInPlace(am, a)
    }
    return am
  }
  if (isSimpleAmount(amount)) {
    return {[amount.unit]: amount.quantity}
  }
  // Supports multiple amounts with the same unit
  if (isMultiAmount(amount)) {
    const am: AmountMap = {}
    for (const a of amount.amounts) {
      AM.incrInPlace(am, a)
    }
    return am
  }
  return amount
}

export function toMultiAmount(
  amount: AnyAmount | null | undefined,
): MultiAmount {
  if (!amount) {
    return {amounts: []}
  }
  if (Array.isArray(amount)) {
    return {amounts: amount}
  }
  if (isSimpleAmount(amount)) {
    return {amounts: [amount]}
  }
  if (isAmountMap(amount)) {
    return {
      amounts: Object.entries(amount).map(([u, q]) =>
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
        A(q, u, amount[AM.meta as any] as AmountMeta | undefined),
      ),
    }
  }
  return amount
}

export function toAmountOrMultiAmount(a: AnyAmount): Amount | MultiAmount {
  if (Array.isArray(a)) {
    return {amounts: a}
  }
  if (isAmountMap(a)) {
    return toMultiAmount(a)
  }
  return a
}

export function toAmounts(amt: AnyAmount | null | undefined) {
  if (!amt) {
    return []
  }
  if (Array.isArray(amt)) {
    return amt
  }
  if (isSimpleAmount(amt)) {
    return [amt]
  }
  if (isMultiAmount(amt)) {
    return amt.amounts
  }
  return AM.toAmounts(amt)
}

export const parseMoney = accounting.unformat.bind(accounting)

/**
 * TODO: Support shorthands such as 12k and 33m
 * Both in terms of parsing and in formatting
 */
export function parseAmount(
  _input: string,
  options: {defaultUnit?: Unit} = {},
): Amount | null {
  const input = _input.trim()
  const match = AMOUNT_REGEX.exec(input)
  const rawQuantity = match?.[1]?.trim()
  const rawUnit = match?.[4]?.trim()
  const unit = rawUnit?.toUpperCase() ?? options.defaultUnit

  if (!rawQuantity || !unit) {
    return null
  }

  let quantity = Number(rawQuantity.replace(/[^\d.-]/g, ''))
  if (Number.isNaN(quantity)) {
    quantity = 0
  }

  return A(quantity, unit)
}

const AMOUNT_REGEX = /^(-?\d+(,\d{3})*(\.\d*)?)(?:\s+(\S+))?$/

export function isAmountUnit(str: string): str is Unit {
  return (
    str.toUpperCase() === str && str.length <= 'PLAID_7DD8KV8OWVUGK4ZQK1'.length
  )
}
