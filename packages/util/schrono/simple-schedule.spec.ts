import * as dateMock from 'jest-date-mock'
import {DateTime} from 'luxon'

import {
  formatSimpleScheduleExpression,
  parseSimpleScheduleExpression,
  SIMPLE_SCHEDULE_REGEX,
} from './simple-schedule'

const now = DateTime.local().set({year: 2020, month: 4, day: 13})

beforeAll(() => {
  dateMock.advanceTo(now.toJSDate())
})

afterAll(() => {
  dateMock.clear()
})

const sampleInputs = [
  'monthly from jan 1 to feb 23',
  'daily from jan 1 to feb 23',
  'daily jan 1 to feb 23',
  'daily jan 1 - feb 23',
  'daily jan 1',
  'jan 3',
  // this returns Jan 1, 2020, which is not correct but
  // still acceptable
  'weekly from dec 31 2020 to jan 1, 2020',
]

test.each(sampleInputs)('SIMPLE_SCHEDULE_REGEX: %o', (input) => {
  expect(input.match(SIMPLE_SCHEDULE_REGEX)?.slice(1)).toMatchSnapshot()
})

test.each(sampleInputs)('parseSimpleScheduleExpression: %o', (input) => {
  const se = parseSimpleScheduleExpression(input)

  expect({
    ...se,
    reformatted: formatSimpleScheduleExpression(se),
  }).toMatchSnapshot()
})
