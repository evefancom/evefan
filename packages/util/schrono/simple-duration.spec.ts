import {parseDurationExpression} from './simple-duration'

describe('Duration expressions', () => {
  test('parseDurationExpression integer', () => {
    expect(parseDurationExpression('2 weeks')?.toObject()).toEqual({weeks: 2})
  })

  test('parseDurationExpression decimal', () => {
    expect(parseDurationExpression('2.5 months')?.toObject()).toEqual({
      months: 2.5,
    })
  })

  test('parse duration assumes days', () => {
    expect(parseDurationExpression('5')?.toObject()).toEqual({days: 5})
  })
})
