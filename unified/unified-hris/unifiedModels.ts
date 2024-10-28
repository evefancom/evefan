import {z} from '@openint/vdk'

export const individual = z.object({
  id: z.string(),
  raw_data: z.record(z.unknown()).optional(),
})

export type Individual = z.infer<typeof individual>
