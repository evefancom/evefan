import {AM, parseMoney} from './amount-utils'

test('AmountMap equals', () => {
  expect(AM.equals({}, {})).toBe(true)
  expect(AM.equals({USD: 0}, {EUR: 0})).toBe(true)

  expect(AM.equals({USD: 0}, {EUR: 1})).toBe(false)

  // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
  expect(AM.equals({USD: 5.1234567890123456}, {USD: 5.123456789012345})).toBe(
    true,
  )
})

test.each([
  ['US$12000.00', 12000],
  ['MX$12000.00', 12000],
  ['CA$12000.00', 12000],
  ['AU$12000.00', 12000],
])('parseMoney("%s") -> %o', (input, output) => {
  expect(parseMoney(input)).toEqual(output)
})
