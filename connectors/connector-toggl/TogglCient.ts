import {createHTTPClient, memoize, z, zFunction} from '@openint/util'

export const zTogglConfig = z.object({
  email: z.string().nullish(),
  password: z.string().nullish(),
  apiToken: z.string().nullish(),
})

export const itemProjectUserResponseSchema = z.object({
  at: z.string(),
  gid: z.number().nullish(),
  group_id: z.number().nullish(),
  id: z.number(),
  labour_cost: z.number().nullish(),
  manager: z.boolean().nullish(),
  project_id: z.number().nullish(),
  rate: z.number().nullish(),
  rate_last_updated: z.string().nullish(),
  workspace_id: z.number().nullish(),
  user_id: z.number().nullish(),
})

export const itemProjectResponseSchema = z.object({
  at: z.string(),
  id: z.number(),
  auto_estimates: z.boolean().nullish(),
  actual_hours: z.number().nullish(),
  active: z.boolean().nullish(),
  billable: z.boolean().nullish(),
  cid: z.number().nullish(),
  client_id: z.number().nullish(),
  color: z.string().nullish(),
  created_at: z.string().nullish(),
  currency: z.string().nullish(),
  current_period: z
    .object({
      end_date: z.string().nullish(),
      start_date: z.string().nullish(),
    })
    .nullish(),
  estimated_hours: z.number().nullish(),
  fixed_fee: z.number().nullish(),
  foreign_id: z.string().nullish(),
  is_private: z.boolean().nullish(),
  name: z.string().nullish(),
  recurring: z.boolean().nullish(),
  recurring_parameters: z
    .object({
      items: z
        .array(
          z.object({
            custom_period: z.number().nullish(),
            estimated_seconds: z.number().nullish(),
            parameter_end_date: z.string().nullish(),
            parameter_start_date: z.string().nullish(),
            period: z.string().nullish(),
            project_start_date: z.string().nullish(),
          }),
        )
        .nullish(),
    })
    .nullish(),

  rate: z.number().nullish(),
  rate_last_updated: z.string().nullish(),

  workspace_id: z.number().nullish(),
  user_id: z.number().nullish(),
})

/** Reference: https://developers.track.toggl.com/docs/api/me */
export const meResponseSchema = z.object({
  id: z.number(),
  api_token: z.string().nullish(),
  email: z.string().nullish(),
  fullname: z.string().nullish(),
  timezone: z.string().nullish(),
  default_workspace_id: z.number().nullish(),
  beginning_of_week: z.number().nullish(),
  image_url: z.string().nullish(),
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
  country_id: z.number().nullish(),
  at: z.string().nullish(),
  intercom_hash: z.string().nullish(),
  openid_email: z.string().nullish(),
  oauth_providers: z.string().array().nullish(),
  has_password: z.boolean().nullish(),
  openid_enabled: z.boolean().nullish(),
})

/** Reference: https://developers.track.toggl.com/docs/api/time_entries */
export const itemTimeEntriesSchema = z.object({
  id: z.number(),
  workspace_id: z.number().nullish(),
  project_id: z.number().nullish(),
  task_id: z.number().nullish(),
  billable: z.boolean().nullish(),
  start: z.string().nullish(),
  stop: z.string().nullish(),
  duration: z.number().nullish(),
  description: z.string().nullish(),
  tags: z.string().array().nullish(),
  tag_ids: z.number().array().nullish(),
  duronly: z.boolean().nullish(),
  at: z.string().nullish(),
  server_deleted_at: z.string().nullish(),
  user_id: z.number().nullish(),
  uid: z.number().nullish(),
  wid: z.number().nullish(),
})

export const makeTogglClient = zFunction(zTogglConfig, (cfg) => {
  const createClient = memoize(() => {
    const token = cfg.apiToken
      ? `${cfg.apiToken}:api_token`
      : `${cfg.email}:${cfg.password}`
    const encodedToken = Buffer.from(token, 'utf8').toString('base64')
    return createHTTPClient({
      baseURL: 'https://api.track.toggl.com/api',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Basic ${encodedToken}`,
      },
    })
  })

  return {
    getMe: zFunction(() =>
      createClient()
        .get<unknown>('/v9/me')
        .then((r) => meResponseSchema.parse(r.data)),
    ),
    getTimeEntries: zFunction(() =>
      createClient()
        .get<unknown>('/v9/me/time_entries')
        .then((r) => itemTimeEntriesSchema.array().parse(r.data)),
    ),
    getProjectUsers: zFunction(z.string(), (wsId) =>
      createClient()
        .get<unknown>(`/v9/workspaces/${wsId}/project_users`)
        .then((r) => itemProjectUserResponseSchema.array().parse(r.data)),
    ),
    getProjects: zFunction(z.string(), (wsId) =>
      createClient()
        .get<unknown>(`/v9/workspaces/${wsId}/projects`)
        .then((r) => itemProjectResponseSchema.array().parse(r.data)),
    ),
  }
})
