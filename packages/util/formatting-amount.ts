// TODO: Add support for formatting with unit support, such as 100k or $1m
// This would be especially useful in tight spaces like charts and reports
// This should probably exist in the format-decimal layer and get used over here
// Should be supported in both intlFormat and customFormat layer
import {
  currencies as ISO_CURRENCIES,
  map as ISO_CURRENCY_SYMBOL_TO_INFO,
} from '@blossomfinance/iso-4217-currencies'
import pluralize from 'pluralize'

import type {Amount, AnyAmount} from './amount-utils'
import {toAmounts} from './amount-utils'
import type {StrictIntlNumberFormatOptions} from './formatting-number'
import {formatDecimal, getIntlNumberFormat} from './formatting-number'

export interface FormatAmountOptions extends _CustomFormatAmountOptions {
  separator?: string
}

export function formatAmount(
  amt: AnyAmount,
  {separator = '; ', ...opts}: FormatAmountOptions = {},
) {
  return toAmounts(amt)
    .map((a) => _formatSingleAmount(a, opts))
    .join(separator)
}

export function _formatSingleAmount(
  amount: Amount,
  {formatCommodity, pluralize, ...intlOpts}: _CustomFormatAmountOptions = {},
) {
  try {
    return _intlFormatAmount(amount, intlOpts)
  } catch (err) {
    // What is the performance implication of throw? Do we want to proactively check?
    if (!(err instanceof RangeError && err.message.includes('currency'))) {
      // multiple error message possibilities, include 'Invalid currency',
      // And 'currency is not a well-formed currency code
      console.error(err)
    }
    // Always fall back to custom format anyways, should as much as possible never crash
    return _customFormatAmount(amount, {
      ...intlOpts,
      formatCommodity,
      pluralize,
    })
  }
}

export interface _IntlFormatAmountOptions
  extends StrictIntlNumberFormatOptions {
  locales?: string | string[]
}

export function _intlFormatAmount(
  amount: Amount,
  {locales, ...opts}: _IntlFormatAmountOptions = {},
) {
  // WARNING: narrowSymbol can be a problem because CA$ and US$ can no longer be told apart...
  let currencyDisplay = opts.currencyDisplay ?? 'symbol'
  // Special case for IDR, whose symbol is `IDR` rather than `Rp`
  if (amount.unit === 'IDR' && currencyDisplay === 'symbol') {
    currencyDisplay = 'narrowSymbol'
  }
  const fmt = getIntlNumberFormat(locales, {
    ...opts,
    style: 'currency',
    currency: amount.unit,
    currencyDisplay,
    minimumFractionDigits:
      opts.minimumFractionDigits ?? getMinimumFractionDigits(amount.unit),
  })
  return fmt.format(amount.quantity)
}

export interface _CustomFormatAmountOptions extends _IntlFormatAmountOptions {
  formatCommodity?: (unit: Unit) => string
  pluralize?: boolean
}

/** Commodity will be suffixed */
export function _customFormatAmount(
  amount: Amount,
  {
    formatCommodity,
    pluralize: _pluralize,
    ...opts
  }: _CustomFormatAmountOptions = {},
) {
  const number = formatDecimal(amount.quantity, opts)
  const commDisplay = formatCommodity
    ? formatCommodity(amount.unit)
    : amount.unit // Lowercase is thus allowed, no need for uppercase first
  const pluraizedCommDisplay = _pluralize
    ? pluralize(commDisplay, amount.quantity)
    : commDisplay

  return `${number} ${pluraizedCommDisplay}`
}

// TODO: Support top crypto currencies as well in addition to physical currencies
export const STANDARD_CURRENCY_SYMBOL_TO_INFO = ISO_CURRENCY_SYMBOL_TO_INFO

export const STANDARD_CURRENCIES = ISO_CURRENCIES

export function getCurrencyInfo(symbol: string) {
  // TODO: Should this be locale dependent? So in Canada USD should be `US$`
  // but according to iso4217 it is `$`.
  // This means that there will be formatting inconsistency as it stands between
  // output vs. input
  // Consider hacking the Intl API to return a standard commodity that takes it into account
  return STANDARD_CURRENCY_SYMBOL_TO_INFO[symbol]
}

export function getMinimumFractionDigits(symbol: string) {
  return getCurrencyInfo(symbol)?.decimalDigits ?? 0
}
