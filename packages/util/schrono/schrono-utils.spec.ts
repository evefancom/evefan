import * as dateMock from 'jest-date-mock'
import {DateTime} from 'luxon'

import {fastEnsureUTC, SCHelpers} from './schrono-utils'

const now = DateTime.fromISO('2020-04-13')

beforeAll(() => {
  dateMock.advanceTo(now.toJSDate())
})

afterAll(() => {
  dateMock.clear()
})

test('fastEnsureUTC', () => {
  const input = '2020-05-05T00:00:00.000+08:00'
  expect(fastEnsureUTC(input)).toBe('2020-05-04T16:00:00.000Z')
})

test.each([
  // text | hasEnd | numResults
  ['jan 15 2020 and mar 15 2020 and apr 1 2021', false, 3],
  ['jan 15 2020 - apr 1 2021', true, 1],
  ['jan 15 2020 - apr 1 2021 feb 2, 2022', true, 2],
  ['30 days ago', false, 1],
  ['30 days from now', false, 1],
  ['last 30 days', true, 1],
  ['Next 30 days', true, 1],

  ['2019 to today', true, 1], // 2019 gets parsed as hour & mins :(
  ['jan 2019 to today', true, 1], // 2019 gets parsed as hour & mins :(

  // '2020',
  // 'Jan 2020',
  // 'jan',
  // 'this month',
])(
  '#%# unambiguousParser.parse("%s") => {hasEnd: %p, len: %d}',
  (input, hasEnd, len) => {
    const res = SCHelpers.chronoParse(input)
    expect(res.length).toEqual(len)
    if (res.length > 0) {
      // eslint-disable-next-line jest/no-conditional-expect
      expect(res[0]?.end != null).toEqual(hasEnd)
    }
  },
)
