// Adapted from https://github.com/wanasit/chrono/blob/v2.3.0/src/locales/en/parsers/ENTimeUnitCasualRelativeFormatParser.ts
import type {ParsingContext} from 'chrono-node/dist/chrono'
import {
  ParsingComponents,
  ReferenceWithTimezone,
} from 'chrono-node/dist/results'
import {DateTime} from 'luxon'

export type TimeUnit =
  | 'second'
  | 'minute'
  | 'hour'
  | 'd'
  | 'week'
  | 'month'
  | 'year'
// More correct than type from chrono-node
export type Fragments = {[k in TimeUnit]?: number}

export function makeRelativeParsingComponents(
  ctx: ParsingContext,
  match: RegExpMatchArray,
  fragments: Fragments,
) {
  const refDt = DateTime.fromMillis(ctx.refDate.getTime())
  let startDt = refDt
  let endDt = refDt
  for (const [_unit, value] of Object.entries(fragments) as Array<
    [TimeUnit, number]
  >) {
    const unit = _unit === 'd' ? 'day' : _unit
    // e.g. last week
    if (value === -1) {
      startDt = startDt.plus({[unit]: value}).startOf(unit)
      endDt = endDt.minus({[unit]: 1}).endOf(unit)
    }
    // e.g. last 3 days
    else if (value < 0) {
      startDt = startDt.plus({[unit]: value}).startOf(unit)
    }
    // e.g. next 3 days
    else if (value > 0) {
      startDt = startDt.plus({[unit]: 1}).startOf(unit)
      endDt = endDt.plus({[unit]: value}).endOf(unit)
    }
  }

  const start = new ParsingComponents(new ReferenceWithTimezone(ctx.refDate))
  populateParsingComponents(start, fragments, startDt)

  const end = new ParsingComponents(new ReferenceWithTimezone(ctx.refDate))
  populateParsingComponents(end, fragments, endDt)

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const res = ctx.createParsingResult(match.index!, match[0]!)
  res.start = start
  res.end = end
  return res
}

export function checkWordBoundary(match: RegExpMatchArray) {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const header = match[1]!
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  match.index = match.index! + header.length
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  match[0] = match[0]!.slice(header.length)
  for (let i = 2; i < match.length; i++) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    match[i - 1] = match[i]!
  }
}

export function populateParsingComponents(
  components: ParsingComponents,
  fragments: Fragments,
  dt: DateTime,
) {
  if ('hour' in fragments || 'minute' in fragments || 'second' in fragments) {
    components.assign('hour', dt.hour)
    components.assign('minute', dt.minute)
    components.assign('second', dt.second)
    components.assign('millisecond', dt.millisecond)
    components.assign('day', dt.day)
    components.assign('month', dt.month)
    components.assign('year', dt.year)
    components.assign('timezoneOffset', dt.offset)
  } else {
    components.imply('hour', dt.hour)
    components.imply('minute', dt.minute)
    components.imply('second', dt.second)
    components.imply('millisecond', dt.millisecond)
    components.imply('timezoneOffset', dt.offset)
  }
  if ('d' in fragments || 'week' in fragments) {
    components.assign('day', dt.day)
    components.assign('month', dt.month)
    components.assign('year', dt.year)
  } else {
    components.imply('day', dt.day)
  }
  if ('month' in fragments) {
    components.assign('month', dt.month)
    components.assign('year', dt.year)
  } else {
    components.imply('month', dt.month)
  }
  if ('year' in fragments) {
    components.assign('year', dt.year)
  } else {
    components.imply('year', dt.year)
  }
}
