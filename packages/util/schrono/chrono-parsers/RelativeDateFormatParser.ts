// Adapted from https://github.com/wanasit/chrono/blob/v2.3.0/src/locales/en/parsers/ENRelativeDateFormatParser.ts
import type {ParsingContext} from 'chrono-node/dist/chrono'
import {TIME_UNIT_DICTIONARY} from 'chrono-node/dist/locales/en/constants'
import _BaseRelativeDateFormatParser from 'chrono-node/dist/locales/en/parsers/ENRelativeDateFormatParser'
import type {ParsingResult} from 'chrono-node/dist/results'
import {DateTime} from 'luxon'

import type {TimeUnit} from './chrono-parser-utils'
import {
  checkWordBoundary,
  makeRelativeParsingComponents,
  populateParsingComponents,
} from './chrono-parser-utils'

export {default as BaseRelativeDateFormatParser} from 'chrono-node/dist/locales/en/parsers/ENRelativeDateFormatParser'

// Parser for expressions like "next week", "last month", "past year", "this year"
export class RelativeDateFormatParser extends _BaseRelativeDateFormatParser {
  override extract(
    ctx: ParsingContext,
    match: RegExpMatchArray,
  ): ParsingResult {
    checkWordBoundary(match)

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const modifier = match[1]!.toLowerCase()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const unitWord = match[2]!.toLowerCase()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const _unit = TIME_UNIT_DICTIONARY[unitWord]! as TimeUnit

    if (modifier === 'next') {
      return makeRelativeParsingComponents(ctx, match, {[_unit]: 1})
    } else if (modifier === 'last' || modifier === 'past') {
      return makeRelativeParsingComponents(ctx, match, {[_unit]: -1})
    } else {
      const refDt = DateTime.fromMillis(ctx.refDate.getTime())
      const unit = _unit === 'd' ? 'day' : _unit

      const start = ctx.createParsingComponents()
      populateParsingComponents(start, {[unit]: 0}, refDt.startOf(unit))

      const end = ctx.createParsingComponents()
      populateParsingComponents(end, {[unit]: 0}, refDt.endOf(unit))

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const res = ctx.createParsingResult(match.index!, match[0]!)
      res.start = start
      res.end = end
      return res
    }
  }
}
