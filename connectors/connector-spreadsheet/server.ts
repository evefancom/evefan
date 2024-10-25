import type {ConnectorServer} from '@openint/cdk'
import {Rx, rxjs} from '@openint/util'
import type {spreadsheetSchemas} from './def'
import {spreadsheetFormats, spreadsheetHelpers} from './def'

// MARK: - Importing all supported formats

export const spreadsheetServer = {
  sourceSync: ({settings, state}) =>
    rxjs
      .from(spreadsheetFormats[settings.preset].parseRows(state.csvString))
      .pipe(
        Rx.map((row, index) =>
          // This part is rather generic. we don't know what a row represents just yet
          // At some point we can extract core-connector-csv out of connector-csv
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          spreadsheetHelpers._opData('csv_row', `row_${index}`, {
            preset: settings.preset,
            row,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any),
        ),
        Rx.concatWith(
          rxjs.from([
            spreadsheetHelpers._op('commit'),
            spreadsheetHelpers._op('ready'),
          ]),
        ),
      ),
} satisfies ConnectorServer<typeof spreadsheetSchemas>

export default spreadsheetServer
