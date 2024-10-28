import type {ConnectorServer, Pta} from '@openint/cdk'
import {handlersLink} from '@openint/cdk'
import {fromCompletion} from '@openint/util'
import {makeAirtableClient} from './AirtableClient'
import type {airtableSchemas} from './def'

export const airtableServer = {
  destinationSync: ({settings}) => {
    const airtable = makeAirtableClient(settings)
    airtable.initBase()

    return handlersLink({
      // eslint-disable-next-line @typescript-eslint/require-await
      data: async (op) => {
        const {
          data: {id, entityName, connectorName, connection_id: sourceId = null, ...data},
        } = op

        const transactionData = (
          entityName === 'transaction'
            ? // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
              (data.entity as any).standard
            : null
        ) as Pta.Transaction
        const partialTxn =
          entityName === 'transaction'
            ? {
                Date: transactionData.date,
                Category: transactionData.description,
                Amount: `${transactionData.postingsMap?.main?.amount.unit} ${transactionData.postingsMap?.main?.amount.quantity}`,
                Payee: '', // TODO: Find way to get this data or use the same as 'Description'
              }
            : {}

        const record = {
          fields: {
            Id: id,
            'Provider Name': connectorName,
            Standard: JSON.stringify(data.entity),
            External: JSON.stringify(data.raw),
            ...partialTxn,
          },
        }
        // TODO: This is probably not right.
        fromCompletion(airtable.insertData({data: record, entityName}))
        return op
      },
    })
  },
} satisfies ConnectorServer<typeof airtableSchemas>

export default airtableServer
