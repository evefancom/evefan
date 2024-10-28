import * as dateMock from 'jest-date-mock'
import * as tzMock from 'timezone-mock'
import {DateTime, Settings} from 'luxon'

import {MPDate} from '../MPDate'
import {MPInterval} from '../MPInterval'

const DEFAULT_ZONE = Settings.defaultZone

beforeAll(() => {
  // TODO: extract this out into separate fn to make mocking easier
  Settings.defaultZone = 'US/Pacific'
  tzMock.register('US/Pacific')
  // Sunday 3/14 was daylight savings...
  dateMock.advanceTo(DateTime.fromISO('2021-03-15', {zone: 'utc'}).toJSDate())
})

afterAll(() => {
  Settings.defaultZone = DEFAULT_ZONE
  tzMock.unregister()
  dateMock.clear()
})

describe.each([
  ['2021-01-01'],
  ['2021-03'],
  ['2021'],
  ['today'],
  ['this month'],
  ['this year'],
  ['jan 2020 to mar 2020'],
  ['jan 1 to mar 1'],
  // --- Copied over from natural date test just to check
  ['2021-03-14T19:00:00.000-07:00'],
  ['2021-03-14'],
  ['2021-03'],
  ['2021'],
  // No time component, and no timezone info
  ['today'],
  ['tomorrow'],
  ['last month'], // TODO(p2): This parses to 2021-02-01/2021-04-01 which is BAD
  ['next year'],
  // With time component, with implied timezone
  ['now'],
  ['today 2pm'],
  ['2pm today'],
  ['Mar 21 2pm'],
  ['2pm Mar 21'],
  // With explicit timezone
  ['today 2pm UTC'],
  ['today 2pm UTC-4'],
  ['1am UTC-4'],
  ['today 1am UTC-4'],
  ['tomorrow 1am UTC-4'],
  ['1am UTC-4 tomorrow'],
  ['Mar 21 1am UTC-4'],
  ['1am UTC-4 Mar 21'],
  // Edge cases
  ['show me this month'], // show me would not be part of `unparse`
  // -- Invalid expressions that maybe we should support?
  ['jan', false],
  ['this jan', false],
  ['last 30 days'],
  ['An appointment on Sep 12-13'],
] as Array<[string, boolean | undefined]>)('#%# "%s"', (text, valid) => {
  test('MPDate.parse(...)', () => {
    const mpd = MPDate.parse(text)
    expect(mpd != null).toEqual(valid !== false)
    expect({
      unparse: mpd?.unparse(),
      toISOMPDate: mpd?.toISOMPDate(),
    }).toMatchSnapshot()
  })

  test('MPInterval.parse(...)', () => {
    const mpi = MPInterval.parse(text)
    expect(mpi != null).toEqual(valid !== false)
    expect({
      unparse: mpi?.unparse(),
      toISODate: mpi?.toISODate(),
      toISO: mpi?.toISO(),
    }).toMatchSnapshot()
  })
})
