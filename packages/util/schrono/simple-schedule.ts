import {invert} from 'lodash'
import type {DateTimeUnit} from 'luxon'
import {Interval} from 'luxon'

import {startCase} from '../string-utils'
import type {DisplayOf, EnumOf} from '../type-utils'
import {MPDate} from './MPDate'

export type Frequency = 'days' | 'weeks' | 'months' | 'quarters' | 'years'

export const FREQUENCIES: EnumOf<Frequency> = {
  days: 'days',
  weeks: 'weeks',
  months: 'months',
  quarters: 'quarters',
  years: 'years',
}

export const FREQUENCY_TO_TIME_UNIT: Record<Frequency, DateTimeUnit> = {
  days: 'day',
  weeks: 'week',
  months: 'month',
  quarters: 'quarter',
  years: 'year',
}

const FREQUENCY_DISPLAY: DisplayOf<Frequency> = {
  days: 'daily',
  weeks: 'weekly',
  months: 'monthly',
  quarters: 'quarterly',
  years: 'yearly',
}

const FREQUENCY_FROM_DISPLAY = invert(FREQUENCY_DISPLAY) as Record<
  string,
  Frequency
>

/**
 * TODO: Create a MPSchedule class and make logic object-oriented
 */

// MARK: - Range expressions

export type Accrual =
  | {date: ISODateTime | ISODate}
  | {
      frequency: Frequency
      interval: ISOInterval
    }

// `-` is a wordbreak character so we cannot use `\b`
// Workaround is to use `\s`
export const SIMPLE_SCHEDULE_REGEX =
  /\s*(daily|monthly|weekly|quarterly|yearly)\s+(?:from\s*)?(.*?)\s*(?:to|until|till|-)\s*(.*)/i

/**
 * TODO: Customize the parsing process so that `jan - mar` parses to
 * `Jan 1 to Mar 31` rather than `Jan 1 to Mar 1`
 * https://github.com/wanasit/chrono#parsedcomponents
 */
export function parseSimpleScheduleExpression(
  input?: string | null,
): Accrual | null {
  return _parseFrequencyAndIntervalExp(input) ?? _parseDateExp(input)
}

export function _parseDateExp(input?: string | null) {
  const dateTime = input && MPDate.parse(input)
  return dateTime ? {date: dateTime.toISODate()} : null
}

export function _parseFrequencyAndIntervalExp(input?: string | null) {
  const match = input?.match(SIMPLE_SCHEDULE_REGEX)
  if (!match) {
    return null
  }

  const [frequencyText, fromText, toText] = match.slice(1) as [
    string,
    string?,
    string?,
  ]
  const frequency = FREQUENCY_FROM_DISPLAY[frequencyText.toLowerCase()]
  const fromDate = fromText && MPDate.parse(fromText)
  const toDate = toText && MPDate.parse(toText)
  if (!frequency || !fromDate || !toDate) {
    return null
  }

  const interval = Interval.fromDateTimes(fromDate, toDate)
  if (!interval.isValid) {
    return null
  }

  return {interval: interval.toISODate(), frequency}
}

export function formatSimpleScheduleExpression(se?: Accrual | null) {
  if (!se) {
    return null
  }
  if ('frequency' in se) {
    const interval = Interval.fromISO(se.interval)
    return `${startCase(
      FREQUENCY_DISPLAY[se.frequency] ?? '',
    )} from ${MPDate.create(
      interval.start,
      'day',
      undefined,
    ).toDisplay()} to ${MPDate.create(
      interval.end,
      'day',
      undefined,
    ).toDisplay()}`
  }
  return MPDate.fromISO(se.date).toDisplay()
}

export function* iterateSubintervals(
  totalInterval: Interval,
  frequency: Frequency,
) {
  if (!FREQUENCIES[frequency]) {
    throw new Error(`Invalid frequency: ${frequency}`)
  }

  const timeUnit = FREQUENCY_TO_TIME_UNIT[frequency]
  const totalDuration = totalInterval.toDuration(frequency)
  const totalDurationQuantity = totalDuration[frequency]

  let start = totalInterval.start.startOf(timeUnit)
  while (start < totalInterval.end) {
    const end = start.plus({[frequency]: 1})
    const interval = Interval.fromDateTimes(
      start < totalInterval.start ? totalInterval.start : start,
      end > totalInterval.end ? totalInterval.end : end,
    )
    const duration = interval.toDuration(frequency)
    const durationQuantity = duration[frequency]
    const ratio = durationQuantity / totalDurationQuantity

    yield {interval, duration, ratio}
    start = end
  }
}
