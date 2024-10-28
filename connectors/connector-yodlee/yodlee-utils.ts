import type {Pta} from '@openint/cdk'
import {A, DateTime, R} from '@openint/util'
import type {YodleeAccount, YodleeBalances} from './yodlee.types'

export function getYodleeAccountName(account: YodleeAccount) {
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  const name = account.nickname || account.accountName || account.displayedName
  const lastFour = account.accountNumber?.slice(-4) ?? null

  // const subtype = startCase(account.accountType)
  // return `${subtype}/${name}`
  // This is now handled in the view layer.
  // return `${provider.name}: ${name}`

  // https://cl.ly/61a480734dd7 Name can be undefined? We added `provider.name`
  // since so might be ok
  return `${account.providerName}: ${[name, lastFour]
    .filter(Boolean)
    .join(' - ')}`
}

export function getYodleeAccountType(acct: YodleeAccount): Pta.AccountType {
  switch (acct.CONTAINER) {
    case 'bank':
      return 'asset/bank'
    case 'investment':
    // Not sure if these actually get returned separately or part of investment
    case 'investment (SN 1.0)':
    case 'investment (SN 2.0)':
      return 'asset/brokerage' // Is this right?
    case 'insurance':
    case 'realEstate':
      return 'asset/real_estate'
    case 'reward':
      return 'asset/rewards'
    case 'otherAssets':
      return 'asset'
    case 'creditCard':
      return 'liability/credit_card'
    case 'loan':
      return 'liability/personal_loan'
    case 'bill':
    case 'otherLiabilities':
      return 'liability'
    default:
      return 'asset'
  }
}

export function getYodleeAccountBalance(
  acct: Pick<YodleeAccount, 'accountType' | 'CONTAINER'> & YodleeBalances,
  type: keyof YodleeBalances,
) {
  const sign =
    acct.accountType === 'CREDIT' ||
    acct.accountType === 'MORTGAGE' ||
    acct.CONTAINER === 'creditCard' ||
    acct.CONTAINER === 'loan' ||
    acct.CONTAINER === 'otherLiabilities' || // Presumably??
    acct.CONTAINER === 'bill' // Presumably??
      ? -1
      : 1
  const amt = acct[type]
  return amt == null ? null : A(amt.amount * sign, amt.currency)
}

export function parseAccountData(
  a: YodleeAccount,
  holdings: Yodlee.HoldingWithSecurity[],
): YodleeAccount {
  return {
    ...a,
    _id: `${a.id}` as ExternalId,
    _balancesMap: {
      [DateTime.utc().toISODate()]: {
        balances: R.pick(a, [
          'balance',
          'remainingBalance',
          'currentBalance',
          'availableCredit',
          'annuityBalance',
          'availableCash',
          'availableBalance',
          'cash',
        ]),
        holdings: holdings.filter((h) => h.accountId === a.id),
      },
    },
  }
}
