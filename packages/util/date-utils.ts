import {DateTime} from 'luxon'
import {format as formatTimeAgo} from 'timeago.js'

import {MPDate} from './schrono'

export {DateTime, Interval, Settings} from 'luxon'
export type {DurationObjectUnits} from 'luxon'

export type FormatDateTimeAs =
  | 'year'
  | 'quarter'
  | 'month'
  | 'week'
  | 'day'
  | 'date'
  | 'date_tabular'
  | 'datetime'
  | 'datetime_smart'
  | 'relative'

export function formatDateTimeOrFail(
  value: string | Date | DateTime | null | undefined,
  as?: FormatDateTimeAs,
) {
  const ret = formatDateTime(value, as)
  if (!ret) {
    throw new Error(`Invalid datetime ${value}`)
  }
  return ret
}

export function formatDateTime(
  value: string | Date | DateTime | null | undefined,
  as?: FormatDateTimeAs,
) {
  if (!value) {
    return null
  }
  const mpd = parseDateTime(value)
  if (!mpd) {
    return null
  }
  switch (as) {
    case 'year':
      return mpd.toUTC().toFormat('yyyy')
    case 'quarter':
      return `Q${mpd.toUTC().toFormat('q yyyy')}`
    case 'month':
      return mpd.toUTC().toFormat('LLL yyyy')
    case 'week':
      return `Week of ${mpd.toUTC().toFormat('DD')}`
    // ISO week number, unpadded
    // return `W${DateTime.fromISO(periodStart).toFormat('W yyyy')}`
    case 'day':
      // Localized date with abbreviated month
      return mpd.toUTC().toFormat('DD')
    case 'date':
      return mpd.toUTC().toLocaleString(DateTime.DATE_MED)
    case 'date_tabular':
      return mpd.toUTC().toFormat('MMM dd, yyyy')
    case 'datetime':
      return mpd.toLocal().toLocaleString(DateTime.DATETIME_MED)
    case 'datetime_smart': {
      const now = DateTime.local()
      return mpd > now.startOf('day')
        ? formatTimeAgo(mpd.toLocal().toJSDate())
        : mpd.toLocal().toLocaleString(DateTime.DATETIME_MED)
    }
    case 'relative':
      return formatTimeAgo(mpd.toLocal().toJSDate())
  }
  // Format firestore dates more precisely.
  if (typeof value === 'object' && 'nanoseconds' in value) {
    // TODO: We should format relative by default and format
    // as absolute on mouse-over as a convention
    return mpd.toLocal().toFormat('ff')
  }
  return mpd.toUTC().toFormat('MMM d, yyyy')
}

export function parseDateTimeOrFail(
  value: string | Date | DateTime | null | undefined,
) {
  const mpd = parseDateTime(value)
  if (!mpd) {
    throw new Error(`Invalid datetime ${value}`)
  }
  return mpd
}

export function parseDateTime(
  value: string | Date | DateTime | null | undefined,
) {
  if (value instanceof DateTime) {
    return MPDate.create(value, 'millisecond', undefined)
  } else if (value instanceof Date) {
    return MPDate.fromJSDate(value)
  } else if (typeof value === 'string') {
    return MPDate.parse(value)
  }
  return null
}
