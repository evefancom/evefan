import * as dateMock from 'jest-date-mock'
import * as tzMock from 'timezone-mock'
import {DateTime, Settings} from 'luxon'

import {MPDate} from '../MPDate'

const DEFAULT_ZONE = Settings.defaultZone
// Sunday 3/14 was daylight savings...
const now = DateTime.fromISO('2021-03-15', {zone: 'utc'})

beforeAll(() => {
  Settings.defaultZone = 'US/Pacific'
  tzMock.register('US/Pacific')
  dateMock.advanceTo(now.toJSDate())
})

afterAll(() => {
  Settings.defaultZone = DEFAULT_ZONE
  tzMock.unregister()
  dateMock.clear()
})

test('sanity check mocking', () => {
  expect(DateTime.local().toISO()).toBe('2021-03-14T17:00:00.000-07:00')
  expect(DateTime.fromObject({}).zoneName).toBe('US/Pacific')
  expect(new Date().getTimezoneOffset()).toBe(420)
  // expect(MPDate.parse('now')?.toISOMPDate()).toEqual('2021-03-14T17:00:00.000-07:00')
  // expect(MPDate.parse('today')?.toISOMPDate()).toEqual('2021-03-14')
  // expect(MPDate.parse('last month')?.toISOMPDate()).toEqual('2021-03')
})

test.each([
  // Standard ISO dates should always be supported even when parsing natural dates
  // Preserving timezone info unlike iso-date functions (by default)
  ['2021-03-15T19:00:00.000-07:00', '2021-03-15T19:00:00.000-07:00'],
  ['2021-03-15', '2021-03-15'],
  ['2021-03', '2021-03'],
  ['2020', '2020'],
  // No time component, and no timezone info
  ['today', '2021-03-14'],
  ['tomorrow', '2021-03-15'],
  ['last month', '2021-02'],
  ['next year', '2022'],
  // With time component, with implied timezone
  ['now', '2021-03-14T17:00:00.000-07:00'],
  ['today 2pm', '2021-03-14T14:00:00.000-07:00'],
  ['2pm today', '2021-03-14T14:00:00.000-07:00'],
  ['Mar 21 2pm', '2021-03-21T14:00:00.000-07:00'],
  ['2pm Mar 21', '2021-03-21T14:00:00.000-07:00'],
  // With explicit timezone
  ['today 2pm UTC', '2021-03-14T07:00:00.000-07:00'],
  ['today 2pm UTC-4', '2021-03-14T11:00:00.000-07:00'],
  ['1am UTC-4', '2021-03-13T21:00:00.000-08:00'], // DST change
  ['today 1am UTC-4', '2021-03-13T21:00:00.000-08:00'], // DST change
  ['tomorrow 1am UTC-4', '2021-03-14T22:00:00.000-07:00'],
  ['1am UTC-4 tomorrow', '2021-03-14T22:00:00.000-07:00'],
  ['Mar 21 1am UTC-4', '2021-03-20T22:00:00.000-07:00'],
  ['1am UTC-4 Mar 21', '2021-03-20T22:00:00.000-07:00'],

  // These do not work... Only support fixed offset timezones
  // ['today at 2pm Eastern', '2021-03-15T11:00:00.000-07:00'],
  // ['today at 2pm US/Eastern', '2021-03-15T11:00:00.000-07:00'],
  // ['today at 2pm NYC', '2021-03-15T11:00:00.000-07:00'],
])("MPDate.parse('%s') -> %s", (text, iso) => {
  expect(MPDate.parse(text)?.toISOMPDate()).toEqual(iso)
})
