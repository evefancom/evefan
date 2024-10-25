import {type FinchSDK, type FinchSDKTypes} from '@openint/connector-finch'
import {mapper, z, zCast} from '@openint/vdk'
import type {HrisAdapter} from '../router'
import * as unified from '../unifiedModels'

type Finch = FinchSDKTypes['oas']['components']['schemas']

const mappers = {
  individual: mapper(zCast<Finch['Individual']>(), unified.individual, {
    id: (r) => r.id ?? '',
    raw_data: (r) => r,
  }),
}

/** TODO: extend zod just like .openapi did */
function tryParse<T>(schema: z.ZodType<T>, input: unknown) {
  const res = schema.safeParse(input)
  return res.success ? res.data : null
}

export const finchAdapter = {
  listIndividual: async ({instance, input}) => {
    // TODO: We should have a general purpose limit / offset paginator
    const offset = tryParse(z.coerce.number().optional(), input?.cursor) ?? 0
    const res = await instance.GET('/employer/directory', {
      params: {query: {offset, limit: input?.page_size}},
    })
    const individuals = res.data.individuals?.map(mappers.individual) ?? []
    const nextOffset = offset + individuals.length
    return {
      has_next_page: nextOffset < (res.data.paging?.count ?? 0),
      items: individuals,
      next_cursor: String(nextOffset),
    }
  },
} satisfies HrisAdapter<FinchSDK>
