import * as dateMock from 'jest-date-mock'
import {DateTime} from 'luxon'

import {MPInterval} from './MPInterval'

const now = DateTime.fromISO('2020-04-13', {zone: 'utc'})

beforeAll(() => {
  dateMock.advanceTo(now.toJSDate())
})

afterAll(() => {
  dateMock.clear()
})

test.each([
  ['Jan 1 2019 to today', ['2019-01-01', now.toISODate()]],
  ['today to today', [now.toISODate(), now.toISODate()]],

  [
    'last week',
    [
      now.minus({weeks: 1}).startOf('week').toISODate(),
      now.minus({weeks: 1}).endOf('week').toISODate(),
    ],
  ],
  [
    'last month',
    [
      now.minus({months: 1}).startOf('month').toISODate(),
      now.minus({months: 1}).endOf('month').toISODate(),
    ],
  ],
  [
    'last year',
    [
      now.minus({years: 1}).startOf('year').toISODate(),
      now.minus({years: 1}).endOf('year').toISODate(),
    ],
  ],
  [
    'this week',
    [now.startOf('week').toISODate(), now.endOf('week').toISODate()],
  ],
  [
    'this month',
    [now.startOf('month').toISODate(), now.endOf('month').toISODate()],
  ],
  [
    'this year',
    [now.startOf('year').toISODate(), now.endOf('year').toISODate()],
  ],

  ['last 3 days', [now.minus({days: 3}).toISODate(), now.toISODate()]],
  [
    'last 3 months',
    [now.minus({months: 3}).startOf('month').toISODate(), now.toISODate()],
  ],
  [
    'last 3 years',
    [now.minus({years: 3}).startOf('year').toISODate(), now.toISODate()],
  ],

  [
    'next 3 days',
    [now.plus({days: 1}).toISODate(), now.plus({days: 3}).toISODate()],
  ],
  [
    'next 3 months',
    [
      now.plus({months: 1}).startOf('month').toISODate(),
      now.plus({months: 3}).endOf('month').toISODate(),
    ],
  ],
  [
    'next 3 years',
    [
      now.plus({years: 1}).startOf('year').toISODate(),
      now.plus({years: 3}).endOf('year').toISODate(),
    ],
  ],
])('MPInterval.parse(%o) -> %p', (input, output) => {
  const int = MPInterval.parse(input)
  expect([int?.start.toISODate(), int?.end.toISODate()]).toEqual(output)
})
