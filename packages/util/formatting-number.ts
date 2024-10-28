import {memoizeBy} from './function-utils'
import {shallowEqual} from './object-utils'

export function formatDecimal(
  value: number,
  options: StrictIntlNumberFormatOptions & {
    locales?: string | string[] | undefined
  } = {},
) {
  const {locales, ...formatOptions} = options
  const formatter = getIntlNumberFormat(locales, {
    style: 'decimal',
    ...formatOptions,
  })
  return formatter.format(value)
}

export function parseDecimal(text: string) {
  const num = Number(text)
  if (Number.isNaN(num)) {
    return undefined
  }
  return num
}

/**
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat
 */
export interface StrictIntlNumberFormatOptions
  extends Intl.NumberFormatOptions {
  style?: 'decimal' | 'currency' | 'percent' | 'unit'
  currencyDisplay?: 'code' | 'symbol' | 'narrowSymbol' | 'name'
  currencySign?: 'standard' | 'accounting'
}

export const getIntlNumberFormat = memoizeBy(
  (
    locales: string | string[] | undefined,
    options: StrictIntlNumberFormatOptions,
  ) => {
    try {
      return new Intl.NumberFormat(locales, options)
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes('currencyDisplay') &&
        options.currencyDisplay === 'narrowSymbol'
      ) {
        // Some browsers do not support narrow symbol formatting.
        return new Intl.NumberFormat(locales, {
          ...options,
          currencyDisplay: 'symbol',
        })
      }
      throw err
    }
  },
  (prev, next) =>
    shallowEqual(prev[0], next[0]) && shallowEqual(prev[1], next[1]),
)
