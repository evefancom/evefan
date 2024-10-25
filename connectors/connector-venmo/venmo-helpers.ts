import type {Pta} from '@openint/cdk'
import type {DateTime} from '@openint/util'
import {A, parseDateTime} from '@openint/util'

export function signFromTransaction(
  txn: Venmo.Transaction,
  currentUserId: string,
) {
  if (txn.payment?.actor.id === currentUserId) {
    return txn.payment.action === 'pay' ? -1 : 1
  }
  if (txn.payment?.target.user.id === currentUserId) {
    return txn.payment.action === 'pay' ? 1 : -1
  }

  // Transfers appears to be only ever out, no deposit so far
  if (txn.transfer) {
    return -1
  }
  // https://venmo.com/account/statement/detail/capture/2895609991383745185?date=12-08-2019
  if (txn.capture) {
    return -1
  }

  console.error('Unable to determine venmo txn sign', txn)
  throw new Error(`Unable to determine venmo txn sign: ${txn.id}`)
}
export function formatUser(user: Venmo.User) {
  // `${user.first_name} ${user.last_name}` doesn't work
  // in the case of venmo groups which do not have first / last names
  return user.display_name || user.username
}

export function formatAction(action: Venmo.Payment['action']) {
  switch (action) {
    case 'pay':
      return 'paid'
    case 'charge':
      return 'charged'
    default:
      throw new Error(`[venmo] Unrecognized payment action ${action}`)
  }
}

export function formatDestination(dest: Venmo.Destination) {
  return `${dest.name} ·· ${dest.last_four}`
}
export function descriptionFromTransaction(txn: Venmo.Transaction) {
  if (txn.payment) {
    return `${txn.payment.note} (${formatUser(
      txn.payment.actor,
    )} ${formatAction(txn.payment.action)} ${formatUser(
      txn.payment.target.user,
    )})`
  }
  if (txn.transfer) {
    const tt = txn.transfer.type === 'instant' ? 'Instant Transfer' : 'Transfer'
    return `${tt} to ${formatDestination(txn.transfer.destination)}`
  }
  // https://share.getcloudapp.com/xQu0Gy4Y
  if (txn.capture) {
    return `Purchase at ${txn.capture.authorization.merchant.display_name}`
  }
  console.error('Unable to determine venmo txn description', txn)
  throw new Error(`Unable to determine venmo txn description: ${txn.id}`)
}

export function payeeFromTransaction(
  txn: Venmo.Transaction,
  currentUserId: string,
) {
  if (txn.payment) {
    const other =
      txn.payment.actor.id === currentUserId
        ? txn.payment.target.user
        : txn.payment.actor
    return formatUser(other)
  }
  if (txn.capture) {
    return txn.capture.authorization.merchant.display_name
  }
  if (txn.transfer) {
    return txn.transfer.destination.name
  }
  return undefined
}

export function postingsFromTransaction(
  txn: Venmo.Transaction,
  currentUserId: string,
): Pta.PostingsMap {
  const sign = signFromTransaction(txn, currentUserId)
  const txnAmount = A(txn.amount * sign, 'USD')

  const accountExternalId = currentUserId as ExternalId
  const postings: Pta.PostingsMap = {
    main: {
      amount: txnAmount,
      accountExternalId,
    },
  }

  // Funding
  if (txn.funding_source && txn.funding_source.type !== 'balance') {
    // Take money from money in transit
    postings['money_in_transit'] = {
      accountType: 'equity/clearing',
      memo: `Funding via ${formatFundingSource(txn.funding_source)} (from)`,
      amount: txnAmount,
    }
    // Increment venmo balance
    postings['funding_source'] = {
      accountType: 'equity/clearing',
      accountExternalId,
      amount: A.invert(txnAmount),
      memo: `Funding via ${formatFundingSource(txn.funding_source)} (to)`,
    }
  }

  // Payment Fee
  if (txn.payment) {
    const feeAmount = A.subtract(
      A(txn.amount, 'USD'),
      A(txn.payment.amount, 'USD'),
    )
    if (feeAmount.quantity < 0) {
      console.warn('[venmo] Fee amount unexpectedly negative', feeAmount, txn)
    }
    if (!A.isZero(feeAmount)) {
      postings['payment_fee'] = {
        accountType: 'expense/transaction_fee',
        memo: 'Venmo payment fee',
        amount: feeAmount,
      }
    }
  }

  // Transfer Fee
  if (txn.transfer) {
    const feeAmount = A(txn.transfer.amount_fee_cents / 100, 'USD')
    if (!A.isZero(feeAmount)) {
      postings['transfer_fee_from'] = {
        accountExternalId,
        memo: 'Venmo transfer fee (from)',
        amount: A.invert(feeAmount),
      }
      postings['transfer_fee_to'] = {
        accountType: 'expense/transaction_fee',
        memo: 'Venmo transfer fee (to)',
        amount: feeAmount,
      }
    }
    if (txn.transfer.status === 'cancelled') {
      for (const [key, post] of Object.entries(postings)) {
        postings[`${key}_cancelled`] = {
          ...post,
          amount: A.invert(post.amount),
          memo: ['Cancelled', post.memo].filter(Boolean).join(' '),
        }
      }
    } else {
      postings.remainder = {accountType: 'equity/clearing'}
    }
  }

  return postings
}

export function formatFundingSource(src: Venmo.FundingSource) {
  return src.last_four ? `${src.name} ·· ${src.last_four}` : src.name
}

export function catchAsNull<T>(fn: () => T | null) {
  try {
    return fn()
  } catch {
    return null
  }
}

export function parseOptionalDateTime(value: PossibleDate | null | undefined) {
  return catchAsNull(() => (value ? parseDateTime(value) : null))
}

export type PossibleDate =
  | string // Assume ISO
  | Date // JS Date
  | DateTime // Luxon Date
// TODO: Need to check two types below since it's from old code
// | number // Assume millis since epoch
// | {seconds: number; nanoseconds: number} // Firestore timestamp
