import Papa from 'papaparse'
import {makePostingsMap} from '@openint/cdk'
import {A, arrayFromObject, DateTime, parseMoney, zCast} from '@openint/util'
import {makeImportFormat} from '../makeImportFormat'
import {RowIdMaker} from '../RowIdMaker'

export interface ETradeTransactionRow {
  /** 05/26/20 */
  TransactionDate: string
  /** Interest */
  TransactionType:
    | 'Interest'
    | 'Divident'
    | 'Bought'
    | 'Sold'
    | 'Contribution'
    | 'Adjustment'
  // pRobably others
  /** BOND */
  SecurityType: string
  /** #2021396 */
  Symbol: string
  /** 0 */
  Quantity: string
  /** 0.14 */
  Amount: string
  /** 0 */
  Price: string
  /** 0 */
  Commission: string
  /** E*TRADE SAVINGS BANK RSDA     INTEREST */
  Description: string
}

const zEtradeRow = zCast<ETradeTransactionRow>()

export const formatEtrade = makeImportFormat({
  name: 'etrade',
  rowSchema: zEtradeRow,
  parseRows: (csvString) =>
    Papa.parse<ETradeTransactionRow>(csvString, {
      header: true,
    }).data.filter((r) => r.TransactionDate.trim()),
  mapEntity: (row, accountExternalId) => {
    const sign = row.TransactionType === 'Bought' ? 1 : -1
    return {
      id: RowIdMaker.idForRow(row),
      entityName: 'transaction',
      entity: {
        date: DateTime.fromFormat(row.TransactionDate, 'MM/dd/yy').toISODate(),
        description: `${row.TransactionType} ${row.Description}`,
        postingsMap: makePostingsMap({
          main: {
            accountExternalId,
            amount: A(sign * parseMoney(row.Quantity), row.Symbol),
          },
        }),
        notes: arrayFromObject(
          row as unknown as Record<string, string>,
          (key, value) => `${key}: ${value}`,
        ).join('\n'),
      },
    }
  },
})
