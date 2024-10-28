import {DateTime, Settings} from 'luxon'

import {MPDate} from '../MPDate'

const DEFAULT_ZONE = Settings.defaultZone

beforeAll(() => (Settings.defaultZone = 'America/Cancun')) // EST

afterAll(() => (Settings.defaultZone = DEFAULT_ZONE))

/** https://moment.github.io/luxon/docs/class/src/datetime.js~DateTime.html#static-method-fromISO */
test('fromISO & setZone timezone behavior', () => {
  const input = '2020-05-05T00:00:00.000+08:00'

  // Convert to local zone by default
  const dt = DateTime.fromISO(input)
  expect(dt.zoneName).toBe('America/Cancun')
  expect(dt.toISO()).toBe('2020-05-04T11:00:00.000-05:00')

  // Convert while preserving point in time
  expect(dt.setZone('utc').zoneName).toBe('UTC')
  expect(dt.setZone('utc').toISO()).toBe('2020-05-04T16:00:00.000Z')

  // Force change timezone, changing point in time
  expect(dt.setZone('utc', {keepLocalTime: true}).zoneName).toBe('UTC')
  expect(dt.setZone('utc', {keepLocalTime: true}).toISO()).toBe(
    '2020-05-04T11:00:00.000Z',
  )

  // Convert to utc explicitly
  const dtUTC = DateTime.fromISO(input, {zone: 'utc'})
  expect(dtUTC.zoneName).toBe('UTC')
  expect(dtUTC.toISO()).toBe('2020-05-04T16:00:00.000Z')

  // Preserve the timezone in the input string
  const dtOrig = DateTime.fromISO(input, {setZone: true})
  expect(dtOrig.zoneName).toBe('UTC+8')
  expect(dtOrig.toISO()).toEqual(input)

  // Specifying both zone and setZone, zone is only used when input string has no zone
  const dtBoth = DateTime.fromISO(input, {zone: 'utc', setZone: true})
  expect(dtBoth.zoneName).toBe('UTC+8')
  expect(dtBoth.toISO()).toEqual(input)
})

test.each([
  ['2020', '2020-01-01T00:00:00.000Z', 'year'],
  ['2020-05', '2020-05-01T00:00:00.000Z', 'month'],
  ['2020-05-05', '2020-05-05T00:00:00.000Z', 'day'],
  // Technically not right... But ok for now...
  ['2020-05-05T01', '2020-05-05T01:00:00.000Z', 'millisecond'],
  ['2020-05-05T00:00:00', '2020-05-05T00:00:00.000Z', 'millisecond'],
  ['2020-05-05T00:00:00.000', '2020-05-05T00:00:00.000Z', 'millisecond'],
  ['2020-05-05T00:00:00.000+0800', '2020-05-04T16:00:00.000Z', 'millisecond'],
  ['2021-03-15T19:45:04.231Z', '2021-03-15T19:45:04.231Z', 'millisecond'],
])('parseMixedDate(%s) -> %s , %s, %s', (raw, iso, expectedPrecision) => {
  const dt = MPDate.fromISO(raw)
  expect(dt.toISO()).toEqual(iso)
  expect(dt.precision).toEqual(expectedPrecision)
})

test.each([
  ['2020', '2020'],
  ['2020-05', 'May 2020'],
  ['2020-05-05', 'May 5, 2020'],
  ['2020-05-05T01', 'May 4, 2020, 8:00 PM'], // Since node 18 we are getting strange character rather than simple space... https://share.cleanshot.com/s46bs1mf
  ['2020-05-05T00:00:00', 'May 4, 2020, 7:00 PM'],
  ['2020-05-05T00:00:00.000', 'May 4, 2020, 7:00 PM'],
  ['2020-05-05T00:00:00.000+0800', 'May 4, 2020, 11:00 AM'],
  ['2021-03-15T19:45:04.231Z', 'Mar 15, 2021, 2:45 PM'],
])('formatMixedPrecisionDate(%s) -> %s', (raw, formatted) => {
  // Try to fix non simply whitespace character with simple space
  expect(MPDate.fromISO(raw).toDisplay().replaceAll(/\s/g, ' ')).toEqual(
    formatted,
  )
})
