import type * as Chrono from 'chrono-node'
import {casual as chrono} from 'chrono-node'
import {DateTime} from 'luxon'

import {
  BaseRelativeDateFormatParser,
  RelativeDateFormatParser,
} from './chrono-parsers/RelativeDateFormatParser'
import {
  BaseTimeUnitCasualRelativeFormatParser,
  TimeUnitCasualRelativeFormatParser,
} from './chrono-parsers/TimeUnitCasualRelativeFormatParser'
import type {DateTimePrecision, ISOMPDate} from './MPDate'

export function fastEnsurePrecision(
  dt: DateTime | ISOMPDate,
  pre: DateTimePrecision,
) {
  const iso = typeof dt === 'string' ? dt : dt.toISO()
  switch (pre) {
    case 'year':
      return iso.slice(0, ISO_YEAR_LEN)
    case 'month':
      return iso.slice(0, ISO_MONTH_LEN)
    case 'day':
      return iso.slice(0, ISO_DAY_LEN)
    default:
      return iso
  }
}

/**
 * Equivalent to DateTime.fromISO(input).setZone('utc').toISO(), but only parse
 * if necessary to avoid unneeded computations
 */
export function fastEnsureUTC(iso: ISOMPDate): ISOMPDate {
  // If already in UTC, do nothing.
  if (iso.endsWith('Z')) {
    return iso
  }
  const [, precision] = precisionFromISO(iso as MixedPrecisionDateExpression)
  if (precision === 'year' || precision === 'month' || precision === 'day') {
    return iso
  }
  return DateTime.fromISO(iso, {zone: 'utc'}).toISO()
}

export function stripTimezoneOffset(iso: ISOMPDate): ISOMPDate {
  const [, precision] = precisionFromISO(iso as MixedPrecisionDateExpression)
  if (precision === 'year' || precision === 'month' || precision === 'day') {
    return iso
  }
  return DateTime.fromISO(iso).toISO({includeOffset: false})
}

// MARK: - Helpers

const ISO_YEAR_LEN = '2000'.length
const ISO_MONTH_LEN = '2000-01'.length
const ISO_DAY_LEN = '2000-01-01'.length

const enhancedChrono = chrono.clone()
enhancedChrono.parsers = enhancedChrono.parsers.map((parser) => {
  if (parser instanceof BaseRelativeDateFormatParser) {
    return new RelativeDateFormatParser()
  }
  if (parser instanceof BaseTimeUnitCasualRelativeFormatParser) {
    return new TimeUnitCasualRelativeFormatParser()
  }
  return parser
})

function chronoParse(text: string) {
  return enhancedChrono.parse(text)
}

function precisionFromISO(
  raw: string,
): [timezone: string | null, precision: DateTimePrecision] {
  switch (raw.length) {
    case ISO_YEAR_LEN:
      return [null, 'year']
    case ISO_MONTH_LEN:
      return [null, 'month']
    case ISO_DAY_LEN:
      return [null, 'day']
    default:
      return [null, 'millisecond']
  }
}

function precisionFromChronoComponents(
  comps: Chrono.ParsedComponents,
): DateTimePrecision {
  if (comps.isCertain('hour')) {
    return 'millisecond'
  }
  if (comps.isCertain('day')) {
    return 'day'
  }
  if (comps.isCertain('month')) {
    return 'month'
  }
  if (comps.isCertain('year')) {
    return 'year'
  }
  return 'millisecond'
}

/** Export a single variable for access */
export const SCHelpers = {
  ISO_YEAR_LEN,
  ISO_MONTH_LEN,
  ISO_DAY_LEN,
  chronoParse,
  precisionFromISO,
  precisionFromChronoComponents,
}
