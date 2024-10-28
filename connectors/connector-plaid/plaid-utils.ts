import type {PlaidEnvName} from './legacy/plaid-helpers'

export function inferPlaidEnvFromToken(
  publicOrAccessToken: string,
): PlaidEnvName {
  const regex = /^(access|public)-(sandbox|development|production)-/
  const match = regex.exec(publicOrAccessToken)

  if (match) {
    return match[2] as PlaidEnvName
  }
  throw new Error('Invalid token without env')
}
