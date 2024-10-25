import {zodToOas31Schema} from '@opensdks/util-zod'
import {zRaw} from '@openint/cdk'
import {R, z} from '@openint/util'
import {publicProcedure, trpc} from './_base'

export const publicRouter = trpc.router({
  health: publicProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/health',
        tags: ['Internal'],
        summary: 'Health check',
      },
    })
    .input(z.void())
    .output(z.string())
    .query(() => 'Ok ' + new Date().toISOString()),
  getPublicEnv: publicProcedure.query(({ctx}) =>
    R.pick(ctx.env, ['NEXT_PUBLIC_NANGO_PUBLIC_KEY']),
  ),
  getRawSchemas: publicProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/debug/raw-schemas',
        tags: ['Internal'],
        description: 'Get raw schemas',
      },
    })
    .input(z.void())
    .output(z.unknown())
    .query(() => R.mapValues(zRaw, (zodSchema) => zodToOas31Schema(zodSchema))),
})
