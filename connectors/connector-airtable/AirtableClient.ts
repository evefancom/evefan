import type {Base, FieldSet, Records} from 'airtable'
import Airtable from 'airtable'
import {titleCase, z, zFunction} from '@openint/util'

export const zAirtableResourceSettings = z.object({
  apiKey: z.string(),
  airtableBase: z.string(),
})

export const zAccount = z.object({
  Id: z.string(),
  'Provider Name': z.string(),
  Standard: z.string(),
  External: z.string(),
})
export const zTransaction = zAccount.extend({
  Date: z.string(),
  Amount: z.string(),
  Category: z.string(),
  Payee: z.string(),
})

export const makeAirtableClient = zFunction(
  zAirtableResourceSettings,
  ({apiKey, airtableBase}) => {
    let base: Base
    const initBase = () => {
      base = new Airtable({apiKey}).base(airtableBase)
    }
    return {
      initBase,
      insertData: zFunction(
        z.object({data: z.any(), entityName: z.string()}),
        async ({data, entityName}) => {
          try {
            // TODO: Need to find a way to prevent duplicate records
            // Refs:  https://community.airtable.com/t/solved-record-duplication-detection-deduping-and-duplicate-merging/340/5
            await base(titleCase(entityName)).create([data])
          } catch (err) {
            console.log(err)
          }
        },
      ),

      getEntity: (
        entityName: string,
        cb: (data: Records<FieldSet>) => void,
      ) => {
        base(entityName)
          .select({
            // Selecting the first 3 records in Grid view:
            maxRecords: 3,
            view: 'Grid view',
          })
          .eachPage(
            function page(records, fetchNextPage) {
              // This function (`page`) will get called for each page of records.

              records.forEach(function (record) {
                console.log('Retrieved', record.get('Id'))
              })
              cb(records)

              // To fetch the next page of records, call `fetchNextPage`.
              // If there are more records, `page` will get called again.
              // If there are no more records, `done` will get called.
              fetchNextPage()
            },
            function done(err) {
              if (err) {
                console.error(err)
                return
              }
            },
          )
      },
    }
  },
)
