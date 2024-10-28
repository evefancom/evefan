import {type PipedriveSDK} from '@opensdks/sdk-pipedrive'
import type {BaseRecord} from '@openint/vdk'
import type {CRMAdapter} from '../../router'
import {mappers} from './mappers'

const _listEntityFullThenMap = async <TIn, TOut extends BaseRecord>(
  instance: PipedriveSDK,
  {
    entity,
    ...opts
  }: {
    entity: string
    mapper: {parse: (rawData: unknown) => TOut; _in: TIn}
    page_size?: number
    cursor?: string | null
  },
) => {
  // Extract me...
  let cursor = opts?.cursor ? Number.parseInt(opts.cursor) : undefined
  if (Number.isNaN(cursor)) {
    cursor = undefined
  }
  const kUpdatedAt = entity === 'users' ? 'modified' : 'update_time'
  const res = await instance.GET(`/${entity as 'persons'}`, {
    params: {
      query: {
        limit: opts?.page_size ?? 100,
        start: cursor,
        // Pipedrive does not support filter but does support sorting, so we can use that
        // to our advantage to implement a binary search for incremental sync
        sort: `${kUpdatedAt} ASC`,
        // NOTE: See if we can get incremental sync working with a real filter
        // filter_id: 1
      },
    },
  })
  return {
    has_next_page: res.data.additional_data?.pagination?.next_start != null,
    items: (res.data.data ?? []).map(opts.mapper.parse),
    next_cursor: res.data.additional_data?.pagination?.next_start?.toString(),
  }
}

export const pipedriveAdapter = {
  // __init__: ({proxyLinks, ctx}) =>
  //   initPipedriveSDK({
  //     headers: {authorization: 'Bearer ...'}, // This will be populated by Nango, or you can populate your own...
  //     links: (defaultLinks) => [
  //       async (req, next) => {
  //         const res = await next(req)
  //         if (res.status === 403) {
  //           const parsed = zErrorPayload.safeParse(await res.clone().json())
  //           if (
  //             parsed.success &&
  //             parsed.data.error === 'Scope and URL mismatch'
  //           ) {
  //             throw new NotAuthorizedError(
  //               ctx.remote.customerId,
  //               ctx.remote.connectorName,
  //               `${parsed.data.error}: ${parsed.data.error_info}`,
  //               parsed.data,
  //             )
  //           }
  //         }
  //         return res
  //       },
  //       ...proxyLinks,
  //       ...defaultLinks,
  //     ],
  //   }),
  listAccounts: async ({instance, input}) =>
    _listEntityFullThenMap(instance, {
      ...input,
      entity: 'persons',
      mapper: mappers.account,
    }),
  listContacts: async ({instance, input}) =>
    _listEntityFullThenMap(instance, {
      ...input,
      entity: 'persons',
      mapper: mappers.contact,
    }),
  listOpportunities: async ({instance, input}) =>
    _listEntityFullThenMap(instance, {
      ...input,
      entity: 'deals',
      mapper: mappers.opportunity,
    }),
  listLeads: async ({instance, input}) =>
    _listEntityFullThenMap(instance, {
      ...input,
      entity: 'leads',
      mapper: mappers.lead,
    }),
  // Currently getting a scope & url mismatch issue, not sure if permanent tho
  // in either case there does not appear to be any actual crm_users synced into production at the moment...
  listUsers: async ({instance, input}) =>
    _listEntityFullThenMap(instance, {
      ...input,
      entity: 'users',
      mapper: mappers.user,
    }),
  // eslint-disable-next-line @typescript-eslint/require-await
  getAccount: async ({}) => {
    throw new Error('Not implemented yet')
  },
} satisfies CRMAdapter<PipedriveSDK>
