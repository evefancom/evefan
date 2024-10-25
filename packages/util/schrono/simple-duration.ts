import {Duration} from 'luxon'

// MARK: - Duration expressions

const DURATION_REGEX = /([\d.]+)\s*(day|week|month|quarter|year)?s?/i
export function parseDurationExpression(
  input?: string | null,
): Duration | null {
  if (!input) {
    return null
  }

  const [, rawQuantity, unit = 'day'] = input.match(DURATION_REGEX) ?? []
  const quantity = rawQuantity ? Number.parseFloat(rawQuantity) : null

  if (quantity == null || Number.isNaN(quantity) || !unit) {
    return null
  }

  return Duration.fromObject({[unit]: quantity})
}
