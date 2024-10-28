import type {RevertSDKTypes} from '@opensdks/sdk-revert'
import {initTwentySDK} from '@opensdks/sdk-twenty'
import type {ConnectorServer} from '@openint/cdk'
import {handlersLink} from '@openint/cdk'
import {R, rxjs} from '@openint/util'
import type {twentySchemas} from './def'

type Revert = RevertSDKTypes['oas']['components']['schemas']

export const twentyServer = {
  destinationSync: ({endUser, source, settings: {access_token}}) => {
    const twenty = initTwentySDK({
      headers: {authorization: `Bearer ${access_token}`},
    })

    let batches: Record<string, Array<{id: string; [k: string]: unknown}>> = {}

    return handlersLink({
      data: (op) => {
        const {
          data: {id, entityName, ...data},
        } = op
        const tableName = entityName
        const batch = batches[tableName] ?? []
        batches[tableName] = batch

        batch.push({
          ...(typeof data.entity === 'object' &&
          data.entity &&
          'raw' in data.entity
            ? {...data.entity}
            : {raw: data.entity}),
          id,
          end_user_id: endUser?.id ?? null,
          source_id: source?.id,
        })
        return rxjs.of(op)
      },
      // eslint-disable-next-line @typescript-eslint/require-await
      commit: async (op) => {
        const size = R.values(batches)
          .map((b) => b.length)
          .reduce((a, b) => a + b, 0)
        if (size === 0) {
          return op
        }

        Object.keys(batches).forEach(async (eName) => {
          if (!batches[eName]?.length) {
            return
          }
          switch (eName) {
            case 'company': {
              const company = batches[eName] as unknown as Array<{
                raw: Revert['commonCompany']
              }>

              await twenty.core.POST('/batch/companies', {
                body: company.map(({raw}) => ({
                  name: raw.name ?? '',
                  // annualRecurringRevenue: {
                  //   amountMicros: String(com.annualRevenue),
                  // },
                  address: [
                    raw.address.street,
                    raw.address.city,
                    raw.address.state,
                    raw.address.country,
                    raw.address.zip,
                    raw.address.postalCode,
                  ].join(', '),
                  // createdAt: String(company.createdTimestamp), // TODO(@jatin): make this typesafe
                  // updatedAt: String(com.updatedTimestamp),
                  // ...(company.additional as Object), // TODO(@jatin): make this work
                })),
              })
              break
            }
            case 'contact': {
              const contact = batches[eName] as unknown as Array<{
                raw: Revert['commonContact']
              }>

              await twenty.core.POST('/batch/people', {
                body: contact.map(({raw}) => ({
                  name: {
                    firstName: raw.firstName,
                    lastName: raw.lastName,
                  },
                  email: raw.email,
                  phone: raw.phone ?? '',
                })),
                // createdAt: String(con.createdTimestamp), // TODO(@jatin): make this typesafe
                // updatedAt: String(con.updatedTimestamp),
                // ...(con.additional as Object), // TODO(@jatin): make this work
              })
              break
            }
            case 'deal': {
              const deal = batches[eName] as unknown as Array<{
                raw: Revert['commonDeal']
              }>

              await twenty.core.POST('/batch/opportunities', {
                body: deal.map(({raw}) => ({
                  name: raw.name ?? '',
                  amount: {
                    amountMicros: String(raw.amount),
                  },
                  probability: String(raw.probability),
                  // stage: d.stage,
                  // createdAt: String(d.createdTimestamp),
                  // updatedAt: String(d.updatedTimestamp),
                  // closeDate: String(d.expectedCloseDate),
                  // ...(d.additional as Object), // TODO(@jatin): make this work
                })),
              })
              break
            }
          }
        })

        batches = {}
        return op
      },
    })
  },
} satisfies ConnectorServer<typeof twentySchemas>

export default twentyServer
