import {z} from '@openint/util'

export const zListParams = z.object({
  limit: z.number().optional(),
  offset: z.number().optional(),
})
