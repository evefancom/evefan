import {z} from '@opensdks/util-zod'
import {zId} from '@openint/cdk'

// TODO: Move this somewhere that is guaranteed to be safe for import from client...

export const kApikeyMetadata = 'apikey' as const

const zPostgresUrl = z
  .string()
  .refine(
    (input) => ['postgres:', 'postgresql:'].includes(new URL(input).protocol),
    {message: 'Invalid PostgreSQL URL format'},
  )

export const zOrganization = z.object({
  id: zId('org'),
  slug: z.string().nullish(),
  // TODO: Add client side encryption for sensitive metadata
  publicMetadata: z.object({
    database_url: zPostgresUrl.optional().openapi({
      title: 'PostgreSQL Database URL',
      description: 'This is where data from resources are synced to by default',
      example: 'postgres://username:password@host:port/database',
    }),
    synced_data_schema: z.string().optional().openapi({
      title: 'Synced Data Schema',
      description:
        'Postgres schema to pipe data synced from end user resources into. Defaults to "synced" if missing.',
    }),
    webhook_url: z.string().optional().openapi({
      title: 'Webhook URL',
      description:
        'Events like sync.completed and connection.created can be sent to url of your choosing',
    }),
    migrate_tables: z.boolean().optional().openapi({
      title: 'Migrate Tables',
      description: 'If enabled, table migrations will be run if needed when entities are persisted',
      default: true,
    }),
  }),
  privateMetadata: z
    .object({
      [kApikeyMetadata]: z.string().optional(),
    })
    .optional(),
})

export type Organization = z.infer<typeof zOrganization>

export const zUser = z.object({
  id: zId('user'),
  publicMetadata: z.object({}).passthrough().optional(),
  privateMetadata: z.object({}).passthrough().optional(),
  unsafeMetadata: z.object({}).passthrough().optional(),
})
export type User = z.infer<typeof zUser>

export interface AuthProvider {
  getOrganization(id: string): Promise<Organization>
  getUser(id: string): Promise<User>
}
