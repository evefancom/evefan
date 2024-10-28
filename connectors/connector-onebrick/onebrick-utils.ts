import type {OneBrickEnvName} from './OneBrickClient'

export function inferOneBrickEnvFromToken(
  publicOrAccessToken: string,
): OneBrickEnvName | null {
  const regex = /^(access|public)-(sandbox|development|production)-/
  const match = regex.exec(publicOrAccessToken)

  if (match) {
    return match[2] as OneBrickEnvName
  }

  return null
}
