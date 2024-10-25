import type {
  ConnectorDef,
  ConnectorSchemas,
  EntityPayloadWithRaw,
} from '@openint/cdk'
import {connHelpers} from '@openint/cdk'
import {z, zCast} from '@openint/util'

export const zPgConfig = z.object({
  databaseUrl: z.string(),
  migrationsPath: z.string().optional(),
  migrationTableName: z.string().optional(),
  transformFieldNames: z.boolean().optional(),
  migrateTables: z.boolean().optional(),
})

export const postgresSchemas = {
  name: z.literal('postgres'),
  // TODO: Should postgres use integration config or resourceSettings?
  // if it's resourceSettings then it doesn't make as much sense to configure
  // in the list of integrations...
  // How do we create default resources for integrations that are basically single resource?
  resourceSettings: zPgConfig.pick({databaseUrl: true, migrateTables: true}).extend({
    // gotta make sourceQueries a Textarea

    sourceQueries: z
      .object({
        invoice: z
          .string()
          .nullish()
          .describe('Should order by lastModifiedAt and id descending'),
      })
      // .nullish() does not translate well to jsonSchema
      // @see https://share.cleanshot.com/w0KVx1Y2
      .optional(),
  }),
  destinationInputEntity: z.object({
    id: z.string(),
    entityName: z.string(),
    // TODO: Fix the support here. We hare hacking postgres to be able
    // support both unified +unified inputs and raw only inputs
    // Basically this should work with or without a link... And it's hard to abstract for now
    entity: z.object({
      // For now... in future we shall support arbitrary columns later
      raw: z.any(),
      unified: z.any(),
    }),
  }),
  sourceOutputEntity: zCast<EntityPayloadWithRaw>(),
  sourceState: z
    .object({
      invoice: z
        .object({
          lastModifiedAt: z.string().optional(),
          lastRowId: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
} satisfies ConnectorSchemas

export const postgresHelpers = connHelpers(postgresSchemas)

export const postgresDef = {
  name: 'postgres',
  metadata: {
    verticals: ['database'],
    logoUrl: '/_assets/logo-postgres.png',
    stage: 'ga',
  },

  schemas: postgresSchemas,
  standardMappers: {
    resource: (_settings) => ({
      displayName: 'Postgres',
      status: 'healthy',
    }),
  },
} satisfies ConnectorDef<typeof postgresSchemas>

export default postgresDef
