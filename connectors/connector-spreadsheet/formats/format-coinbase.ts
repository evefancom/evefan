import Papa from 'papaparse'
import {makePostingsMap} from '@openint/cdk'
import {A, DateTime, parseMoney, zCast} from '@openint/util'
import {makeImportFormat} from '../makeImportFormat'
import {RowIdMaker} from '../RowIdMaker'

export interface CoinbaseTransactionRow {
  /** 2013-05-19T20:21:04Z */
  Timestamp: string
  /** Receive */
  'Transaction Type': 'Buy' | 'Sell' | 'Send' | 'Receive'
  /** BTC */
  Asset: string
  /** 0.1 */
  'Quantity Transacted': string
  /** "" */
  'USD Spot Price at Transaction': string
  /** "" */
  'USD Subtotal': string
  /** 122.82 */
  'USD Total (inclusive of fees)': string
  /** "" */
  'USD Fees': string
  /** Received 0.1000 BTC from Arjun Vasan */
  Notes: string
}

const zCoinBaseRow = zCast<CoinbaseTransactionRow>()

export const formatCoinBase = makeImportFormat({
  name: 'coinbase',
  rowSchema: zCoinBaseRow,
  parseRows: (csvString) =>
    Papa.parse<CoinbaseTransactionRow>(csvString, {
      header: true,
    }).data.filter((r) => r.Timestamp.trim()),
  mapEntity: (row, accountExternalId) => {
    const sign =
      row['Transaction Type'] === 'Buy' || row['Transaction Type'] === 'Receive'
        ? 1
        : -1
    return {
      id: RowIdMaker.idForRow(row),
      entityName: 'transaction',
      entity: {
        date: DateTime.fromISO(row.Timestamp).toISODate(),
        description: row.Notes,
        postingsMap: makePostingsMap(
          {
            main: {
              accountExternalId,
              amount: A(
                sign * parseMoney(row['Quantity Transacted']),
                row.Asset,
              ),
            },
          },
          row['USD Fees']
            ? {
                post_fee: {
                  accountType: 'expense/transaction_fee',
                  amount: A(parseMoney(row['USD Fees']), 'USD'),
                  memo: 'Coinbase Fees',
                },
              }
            : {},
        ),
        notes: `
      Transaction Type: ${row['Transaction Type']}
      Timestamp: ${row.Timestamp}
      USD Spot Price at Transaction: ${row['USD Spot Price at Transaction']}
      USD Subtotal: ${row['USD Subtotal']}
      USD Total: ${row['USD Total (inclusive of fees)']}
          `.trim(),
      },
    }
  },
})
