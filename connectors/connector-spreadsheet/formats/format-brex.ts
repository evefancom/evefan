import Papa from 'papaparse'
import {makePostingsMap} from '@openint/cdk'
import {A, DateTime, leftPad, zCast} from '@openint/util'
import {makeImportFormat} from '../makeImportFormat'
import {RowIdMaker} from '../RowIdMaker'

export interface BrexTransactionRow {
  /** ISO8601 DateTime */
  'Swipe Date (UTC)': string
  /** @deprecated ISO8601 DateTime */
  'Posted Date (UTC)'?: string
  /** ISO8601 DateTime. Current as of Jun 17. 2021 */
  'Posted Date'?: string
  Type: 'Transaction' | 'Payment to Brex' // | string ?
  /** Needs to be inverted. Positive amount means more liability */
  Amount: string
  /** Useful for balance assertion later. or at least to display info in the UI */
  'Outstanding Balance': string
  User: string
  Department: string
  Location: string
  'Transaction Source': string
  'Statement Descriptor': string
  'Merchant Name': string
  'Brex Category': string
  'Integration Category': string
  'Last 4': string
  Memo: string
  'Integration Department': string
  'Integration Class': string
  'Integration Location': string
  'Integration Date': string
  'Integration Category Fully Qualified Name': string
  Id: string
}

const zBrexRow = zCast<BrexTransactionRow>()

export const formatBrex = makeImportFormat({
  name: 'brex',
  rowSchema: zBrexRow,
  parseRows: (csvString) =>
    Papa.parse<BrexTransactionRow>(csvString, {
      header: true,
    }).data.filter(
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      (r) => r['Posted Date'] || r['Swipe Date (UTC)'],
    ),
  mapEntity: (row, accountExternalId) => {
    // https://app.asana.com/0/998123529255805/1163654157352041/f
    // Add leading zeros hack till Brex fixes it on their side.
    // also Brex formats last 4 with a `*` on their end... So we do the same
    // Note this is likely make sense for Payment To Brex. Do not use if the case
    const last4Padded = `*${leftPad(row['Last 4'], 4, '0')}`

    const isPayment = row.Type === 'Payment to Brex'

    return {
      id: RowIdMaker.idForRow(row),
      entityName: 'transaction',
      entity: {
        date: row['Posted Date']
          ? DateTime.fromFormat(row['Posted Date'], 'MM/dd/yyyy').toISODate()
          : (row['Posted Date (UTC)'] ?? row['Swipe Date (UTC)']).slice(
              0,
              '2020-01-01'.length,
            ),
        // TODO(p2): How to resolve Brex transactions getting removed issue?
        // As far as I know Brex doesn't tell us whether a transaction is pending :(
        description:
          row['Statement Descriptor'] ||
          (isPayment && 'Payment to Brex') ||
          // Should never happen, but just in case...
          'Brex Transaction',
        payee: row['Merchant Name'],
        externalCategory: row['Brex Category'],
        // TODO: How do we get receipt info?
        notes: row.Memo,
        postingsMap: makePostingsMap({
          main: {
            // let alka view layer generate accountExternalId based on accountName
            // If there's no row.User though this is most likely a Payment to Brex
            // transaction. However just in case...
            // Does not appear to be working for some reason...
            accountExternalId,
            // TODO(p3): Confirm Brex is USD only
            amount: A(-1 * Number.parseFloat(row.Amount), 'USD'),
            // Hack for now. We really need custom fields
            memo: row.User && `${row.User}/${last4Padded}`,
          },
          remainder: isPayment
            ? {accountType: 'equity/clearing'}
            : {accountType: 'expense'}, // Highly unlikely for income to come into Brex.
        }),
        custom: {user: row.User, lastFour: last4Padded},
      },
    }
  },
})
