import {isAsyncIterable, isIterable} from './iterable-utils'

function* yieldNever() {}
async function* asyncYieldNever() {}

test('isIterable', () => {
  expect(isIterable({})).toBe(false)
  expect(isIterable(null)).toBe(false)
  expect(isIterable([])).toBe(true)

  expect(isIterable(yieldNever())).toBe(true)
  expect(isIterable(asyncYieldNever())).toBe(false)
})

test('isAsyncIterable', () => {
  expect(isAsyncIterable({})).toBe(false)
  expect(isAsyncIterable(null)).toBe(false)
  expect(isAsyncIterable([])).toBe(false)

  expect(isAsyncIterable(yieldNever())).toBe(false)
  expect(isAsyncIterable(asyncYieldNever())).toBe(true)
})
