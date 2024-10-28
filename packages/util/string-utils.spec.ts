import {pluralize, startCase} from './string-utils'

test('startCase converts / to space', () => {
  expect(startCase('credit/credit card')).toBe('Credit Credit Card')
})

test('startCase preserves uppercase', () => {
  expect(startCase('credit/CREDIT_CARD')).toBe('Credit CREDIT CARD')
})

test.each<[number, string, string]>([
  [100, 'Session', 'Sessions'],
  [100, 'USD', 'USDS'],
  [100, 'thesis', 'theses'],
  [1.3, 'thesis', 'theses'],
  [0.5, 'thesis', 'theses'],
  [0, 'thesis', 'theses'],
  [1, 'thesis', 'thesis'],
  [-1, 'thesis', 'theses'],
])('pluraize (%p, %p) -> %p', (num, word, output) => {
  expect(pluralize(word, num)).toEqual(output)
})
