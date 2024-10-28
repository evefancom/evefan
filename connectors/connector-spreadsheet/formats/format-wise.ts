import Papa from 'papaparse'
import {makePostingsMap} from '@openint/cdk'
import {A, DateTime, parseMoney, R, zCast} from '@openint/util'
import {makeImportFormat} from '../makeImportFormat'
import {RowIdMaker} from '../RowIdMaker'

export interface WiseTransactionRow {
  /**
   * May not in fact be unique in situations where transactions are cancelled
   * @see https://share.cleanshot.com/uZ3cAA
   */
  'TransferWise ID': string
  Date: string
  Amount: string // number
  Currency: string
  Description: string
  'Payment Reference': string
  'Running Balance': string // number
  'Exchange From': string
  'Exchange To': string
  'Exchange Rate': string // number
  'Payer Name': string
  'Payee Name': string
  'Payee Account Number': string // number
  Merchant: string
  'Card Last Four Digits': string
  'Card Holder Full Name': string
  Attachment: string
  Note: string
  'Total fees': string // number
}

const zWiseRow = zCast<WiseTransactionRow>()

export const formatWise = makeImportFormat({
  name: 'wise',
  rowSchema: zWiseRow,
  parseRows: (csvString) =>
    Papa.parse<WiseTransactionRow>(csvString, {
      header: true,
    }).data.filter((r) => r.Date.trim()),

  mapEntity: (row, accountExternalId) => {
    /** e.g. -233 (USD) */
    const quantity = parseMoney(row.Amount)
    /** e.g. 2 (USD) fee quantity are always positive */

    // 1 means fee was refunded, -1 means fee was taken
    const feeQuantity =
      parseMoney(row['Total fees']) *
      // There is no reliable way to tell whether a fee was taken vs. refunded...
      // @see https://share.cleanshot.com/fUqXtc
      // TODO: Switch to accounting export for wise and see if it becomes clear
      (quantity > 0 &&
      !row.Description.toLowerCase().includes('topped up account')
        ? 1
        : -1)
    // const feeMemo = feeQuantity < 0 ? 'Fee' : 'Fee refund'
    const feePayee = 'Wise'
    /** e.g. 231 USD */
    const mainAmount = A(quantity - feeQuantity, row.Currency)
    /** e.g. 14,242 IDR (/USD) */
    const exchangePrice = A(
      parseMoney(row['Exchange Rate']),
      row['Exchange To'],
    )
    return {
      id: RowIdMaker.idForRow(row),
      entityName: 'transaction',
      entity: {
        date: DateTime.fromFormat(row.Date, 'dd-MM-yy').toISODate(),
        description: R.compact([
          // feeQuantity > 0 && '[Reversal]',
          row['Payment Reference'],
          row.Description,
        ]).join(' '),
        payee: [
          row['Payee Name'] ?? row['Payer Name'],
          row['Payee Account Number'] && `(${row['Payee Account Number']})`,
        ].join(' '),
        notes: R.compact([
          row['Exchange From'] &&
            row['Exchange To'] &&
            row['Exchange Rate'] &&
            `${row['Exchange From']}:${row['Exchange To']} @ ${row['Exchange Rate']}`,
          row.Note,
        ]).join('\n'),
        postingsMap: makePostingsMap(
          {
            main: {
              accountExternalId,
              amount: mainAmount,
              price: exchangePrice.quantity
                ? {type: 'unit', amount: exchangePrice}
                : undefined,
            },
          },
          {
            ...(feeQuantity && {
              main__fee: {
                accountExternalId,
                amount: A(feeQuantity, row.Currency),
                // memo: `${feeMemo} ${feeQuantity < 0 ? 'source' : 'destination'}`,
                payee: feePayee,
              },
              fee: {
                amount: A(feeQuantity * -1, row.Currency),
                payee: feePayee,
                // memo: `${feeMemo} ${feeQuantity < 0 ? 'destination' : 'source'}`,
              },
            }),
          },
        ),
      },
    }
  },
})
