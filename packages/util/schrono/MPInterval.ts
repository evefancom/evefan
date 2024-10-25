import {Interval} from 'luxon'
import type {Writable} from 'type-fest'

import {MPDate} from './MPDate'
import {SCHelpers} from './schrono-utils'

/**
 * TODO:
 * - [ ] Support open-ended intervals with Infinity on either side
 *  - Expression such as since 2020 or until 2019
 */

// type ISOMPInterval = string
export type MPIntervalExpression = string
export interface MPInterval extends Interval {
  /** Expression input. Will be used in `unparse` if provided  */
  readonly expression: string | undefined
  /** Basically `toStandard`. Will preserve relative date, fall back to ISO */
  unparse(opt?: {abs?: boolean}): string
}

export const MPInterval = {
  create(_int: Interval, exp: MPIntervalExpression | undefined): MPInterval {
    const interval = _int as Writable<MPInterval>
    interval.expression = exp
    interval.unparse = function (opts) {
      return this.expression != null && !opts?.abs
        ? this.expression
        : this.toISO()
    }
    return interval
  },

  // MARK: - Static methods

  parse(input: string) {
    const mpd = MPDate.fromISO(input)
    if (mpd.isValid) {
      return this.create(mpd.toInterval(), undefined)
    }
    return this.fromNaturalExpression(input)
  },

  // TODO: Add toISO method

  /** Prefer `fromString` to this, which handles ISO too */
  fromNaturalExpression(exp: MPIntervalExpression) {
    const [res] = SCHelpers.chronoParse(exp)
    if (!res) {
      return null
    }

    const start = MPDate.fromChronoComponents(res.start, res.text)
    const end = res.end && MPDate.fromChronoComponents(res.end, res.text)
    return this.create(
      end ? Interval.fromDateTimes(start, end) : start.toInterval(),
      res.text,
    )
  },
}
