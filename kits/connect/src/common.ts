import {z} from 'zod'

export const zFrameMessage = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('SUCCESS'),
    data: z.object({resourceId: z.string()}), // Need to better type resourceId
  }),
  z.object({
    type: z.literal('ERROR'),
    data: z.object({code: z.string(), message: z.string()}),
  }),
])
export type FrameMessage = z.infer<typeof zFrameMessage>

export const defaultHost = 'https://openint.dev'

export interface GetIFrameProps {
  baseUrl?: string | null
  params?: {token?: string; displayName?: string}
}

export const getIFrameUrl = ({
  baseUrl = defaultHost,
  params = {},
}: GetIFrameProps) => {
  const placeholder = 'https://placeholder'
  const url = new URL('/connect/portal', baseUrl ?? placeholder)
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value)
    }
  })
  return baseUrl ? url.toString() : url.toString().replace(placeholder, '')
}
