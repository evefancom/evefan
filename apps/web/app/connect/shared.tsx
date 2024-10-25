import {zId} from '@openint/cdk'
import {z} from '@openint/util'

export const kConnectSession = 'connect-session'

export type ConnectSession = z.infer<typeof zConnectSession>
export const zConnectSession = z.object({
  token: z.string(),
  resourceId: zId('reso'),
})
