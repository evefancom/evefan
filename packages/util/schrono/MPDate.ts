import type * as Chrono from 'chrono-node'
import type {DateTimeJSOptions, DateTimeOptions} from 'luxon'
import {DateTime, FixedOffsetZone, Interval, Settings} from 'luxon'
import type {Writable} from 'type-fest'

import {SCHelpers} from './schrono-utils'

/**
 * TODO:
 * - [ ] Use either strict mode or say crazy reference date distinguish relative
 *   date expression from absolute ones. Only save relative ones when unparse
 * - [ ] Replace all the other date utils with this
 * - [ ] Format Format relative time output
 */

export type DateTimePrecision = 'year' | 'month' | 'day' | 'millisecond'

export type ISOMPDate = string
/** Natural expression. Includes ISO though */
export type MPDateExpression = string
/** Mixed presision date */
export interface MPDate extends DateTime {
  /** Expression input. Will be used in `unparse` if provided  */
  readonly expression: string | undefined
  readonly precision: DateTimePrecision
  /** Will ignore expression & lose relative date */
  toISOMPDate(): ISOMPDate
  /** To human readable string */
  toDisplay(): string
  /** Basically `toStandard`. Will preserve relative date, fall back to ISO */
  unparse(opt?: {abs?: boolean}): string

  /** Based on precision */
  toInterval(): Interval
}

export const MPDate = {
  create(
    dateTime: DateTime,
    precision: DateTimePrecision,
    raw: string | undefined,
  ): MPDate {
    const mpd = dateTime as Writable<MPDate>
    mpd.expression = raw
    mpd.precision = precision
    mpd.toISOMPDate = function () {
      const iso = this.toISO()
      switch (this.precision) {
        case 'year':
          return iso.slice(0, SCHelpers.ISO_YEAR_LEN)
        case 'month':
          return iso.slice(0, SCHelpers.ISO_MONTH_LEN)
        case 'day':
          return iso.slice(0, SCHelpers.ISO_DAY_LEN)
        default:
          return iso
      }
    }
    mpd.toDisplay = function () {
      switch (this.precision) {
        case 'year':
          return this.toFormat('yyyy')
        case 'month':
          return this.toFormat('MMM yyyy')
        case 'day':
          return this.toFormat('MMM d, yyyy')
        default:
          // https://moment.github.io/luxon/docs/manual/formatting.html#table-of-tokens
          return this.toLocal().toFormat('ff')
      }
    }
    mpd.unparse = function (opts) {
      return this.expression != null && !opts?.abs
        ? this.expression
        : this.toISOMPDate()
    }
    mpd.toInterval = function () {
      const interval = Interval.after(this, {[this.precision]: 1})
      return interval
    }
    return mpd
  },

  // MARK: - Static method equivalents

  /** Will test ISO first, then after */
  parse(input: string) {
    const mpd = MPDate.fromISO(input, {setZone: true})
    if (mpd.isValid) {
      return mpd
    }
    return this.fromNaturalExpression(input)
  },

  fromNaturalExpression(exp: MPDateExpression) {
    const [res] = SCHelpers.chronoParse(exp)
    if (!res) {
      return null
    }
    // WARNING: res.text does not equal exp
    return this.fromChronoComponents(res.start, res.text)
  },

  fromChronoComponents(comps: Chrono.ParsedComponents, exp: MPDateExpression) {
    // Using `DateTime.fromObject` here works better with mocked dates
    const offset = comps.get('timezoneOffset')
    const zone = offset != null ? FixedOffsetZone.instance(offset) : undefined
    const dt = DateTime.fromObject(
      {
        year: comps.get('year') ?? undefined,
        month: comps.get('month') ?? undefined,
        day: comps.get('day') ?? undefined,
        hour: comps.get('hour') ?? undefined,
        minute: comps.get('minute') ?? undefined,
        second: comps.get('second') ?? undefined,
        millisecond: comps.get('millisecond') ?? undefined,
      },
      {zone},
    )
    const localDt = dt.setZone(Settings.defaultZone)
    const precision = SCHelpers.precisionFromChronoComponents(comps)
    return this.create(localDt, precision, exp)
  },

  fromISO(iso: string, opts?: DateTimeOptions) {
    const [, precision] = SCHelpers.precisionFromISO(iso)
    const dt = DateTime.fromISO(iso, {zone: 'utc', ...opts})
    return this.create(dt, precision, undefined)
  },

  fromJSDate(
    date: Date,
    {
      precision,
      ...options
    }: DateTimeJSOptions & {precision?: DateTimePrecision} = {},
  ) {
    return this.create(
      DateTime.fromJSDate(date, options),
      precision ?? 'millisecond',
      undefined,
    )
  },
}
