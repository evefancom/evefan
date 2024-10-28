import Papa from 'papaparse'
import {A, DateTime, parseMoney, zCast} from '@openint/util'
import {makeImportFormat} from '../makeImportFormat'
import {RowIdMaker} from '../RowIdMaker'

export interface BrexCashTransactionRow {
  /* 11/20/2019 */
  Date: string
  /* Mercury Bank - Checking */
  Description: string
  /* 1.0e5 */
  Amount: string
  /* 1.0e5 */
  Balance: string
}

const zBrexCashRow = zCast<BrexCashTransactionRow>()

export const formatBrexCash = makeImportFormat({
  name: 'brex-cash',
  rowSchema: zBrexCashRow,
  parseRows: (csvString) =>
    Papa.parse<BrexCashTransactionRow>(csvString, {
      header: true,
    }).data.filter((r) => r.Date.trim()),
  mapEntity: (row, accountExternalId) => ({
    id: RowIdMaker.idForRow(row),
    entityName: 'transaction',
    entity: {
      date: DateTime.fromFormat(row.Date, 'MM/dd/yyyy').toISODate(),
      // don't think brex cash handles pending
      description: row.Description,
      postingsMap: {
        main: {
          accountExternalId,
          // Far as I know brex cash is USD only
          // Occasionally we get an amount like... `US$12000.00`
          amount: A(parseMoney(row.Amount), 'USD'),
        },
      },
    },
  }),
})
