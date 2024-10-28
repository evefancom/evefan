import {z} from '@opensdks/util-zod'

export const _zOauthConfig = z.object({
  clientId: z.string(),
  clientSecret: z.string(),
})

export const zCcfgAuth = {
  oauth: z.object({oauth: _zOauthConfig}),
  oauthOrApikeyAuth: z.object({
    oauth: z
      .union([
        z.null().describe('No oauth'),
        _zOauthConfig.describe('Configure oauth'),
      ])
      .optional()
      .describe('Oauth support'),
    apikeyAuth: z.boolean().optional().describe('API key auth support'),
  }),
}
