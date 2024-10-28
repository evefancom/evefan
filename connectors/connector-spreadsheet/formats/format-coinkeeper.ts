import Papa from 'papaparse'
import {makePostingsMap} from '@openint/cdk'
import {A, DateTime, objectFromArray, parseMoney, zCast} from '@openint/util'
import {makeImportFormat} from '../makeImportFormat'
import {RowIdMaker} from '../RowIdMaker'

export interface CoinkeeperTransactionRow {
  /** Date */ Данные: string
  /** Type */ Тип: string
  /** From */ Из: string
  /** To */ В: string
  /** Labels. e.g. Семья, Бабушка Вера */ Метки: string
  /** Amount */ Сумма: string
  /** Currency */ Валюта: string
  /** Amount in other currency */ 'Сумма в др.валюте': string
  /** Other currency */ 'Др.валюта': string
  /** Repetition */ Повторение: string
  /** Note */ Заметка: string
}

const zCoinKeeperRow = zCast<CoinkeeperTransactionRow>()

export const formatCoinKeeper = makeImportFormat({
  name: 'coinkeeper',
  rowSchema: zCoinKeeperRow,
  parseRows: (csvString) =>
    Papa.parse<CoinkeeperTransactionRow>(csvString, {
      header: true,
    }).data.filter((r) => r['Данные'].trim()),
  mapEntity: (_row, accountExternalId) => {
    const row = {
      Date: _row['Данные'],
      Type: _row['Тип'],
      From: _row['Из'],
      To: _row['В'],
      Labels: _row['Метки'],
      Amount: _row['Сумма'],
      Currency: _row['Валюта'],
      'Amount in other currency': _row['Сумма в др.валюте'],
      'Other currency': _row['Др.валюта'],
      Repetition: _row['Повторение'],
      Note: _row['Заметка'],
    }
    const fromId = RowIdMaker.uniqueIdForAccount(accountExternalId, row.From)
    const toId = RowIdMaker.uniqueIdForAccount(accountExternalId, row.To)
    // Ramp omits missing zero so we add it
    const isExpense = row.Type === 'Расход'
    return {
      id: RowIdMaker.idForRow(row),
      entityName: 'transaction',
      entity: {
        date: DateTime.fromFormat(row.Date, 'M/d/yy').toISODate(),
        labelsMap: {
          ...objectFromArray(
            row.Labels.split(',')
              .map((l) => l.trim())
              .filter((l) => !!l),
            (l) => l,
            () => true,
          ),
        },
        description: row.Note,
        notes: Object.entries(_row)
          .map(([header, value]) => `${header}: ${value}`)
          .join('\n'),
        // TODO: Need to figure out how to work out payment to ramp
        postingsMap: makePostingsMap({
          main: {
            accountExternalId: isExpense ? fromId : toId,
            amount: A(-1 * parseMoney(row.Amount), row.Currency),
          },
          // At least attempt to maek the `main` posting belong to a balance sheet account
          remainder: {accountExternalId: isExpense ? toId : fromId},
        }),
      },
    }
  },
})
