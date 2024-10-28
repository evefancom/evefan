import * as tzMock from 'timezone-mock'
import {DateTime, Settings} from 'luxon'

// Warning: How would this behave if timezone is involved? Gah :(

// TODO: It would be really nice to have a function to simulate across all timezones
// to make sure a set of tests is true regardless of what timezone the system is in.

test('comparison between ISODate and ISODateTime', () => {
  // These are fine
  expect('2020-01-01' < '2020-01-01T13:14:20.426Z').toBe(true)
  expect('2020-01-02' > '2020-01-01T13:14:20.426Z').toBe(true)

  // This is the pathological case. They ought to be equal
  expect('2020-01-01' < '2020-01-01T00:00:00.000Z').toBe(true)
})

test.each([
  ['2021-06-30 19:57', null], // fails parsing
  ['2021-06-30T19:57', '2021-06-30T19:57:00.000-07:00'],
  ['2021-06-30', '2021-06-30T00:00:00.000-07:00'],
  ['2021-06-30T19:57:00+08:00', '2021-06-30T19:57:00.000+08:00'],
])('DateTime.fromISO(%o, {setZone: true})', (input, output) => {
  Settings.defaultZone = 'US/Pacific'
  tzMock.register('US/Pacific')
  expect(DateTime.fromISO(input, {setZone: true}).toISO()).toEqual(output)
})
