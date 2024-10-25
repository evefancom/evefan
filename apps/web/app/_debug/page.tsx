'use client'

import 'next/image'
import '../global.css'
import {SchemaForm} from '@/../../packages/ui'
import {z} from '@/../../packages/util'

// TODO: Improve the rendering of discriminated union. In particular
const schemas = {
  dunion: z.discriminatedUnion('type', [
    z.object({
      type: z.literal('oauth'),
      clientId: z.string().min(2),
      clientSecret: z.string().min(2),
    }),
    z.object({type: z.literal('apikey')}),
  ]),
  oneof: z.union([
    z.object({
      type: z.literal('oauth'),
      clientId: z.string(),
      clientSecret: z.string(),
    }),
    z.object({type: z.literal('apikey')}),
  ]),
  nullish: z.object({
    oauth: z
      .union([
        z
          .object({
            clientId: z.string(),
            clientSecret: z.string(),
          })
          .describe('Configure oauth'),
        z.null().describe('No oauth'),
      ])
      .optional()
      .describe('Oauth support'),
    apikeyAuth: z.boolean().optional().describe('API key auth support'),
  }),
}

export default function Demo() {
  return (
    <div className="flex h-screen w-screen flex-col p-8">
      <SchemaForm
        // Discriminated union does not work for jsonschema for for now
        // Gotta figure out better way

        schema={schemas.nullish}
        jsonSchemaTransform={(schema) => {
          console.log('schema', schema)
          return schema
        }}
      />
    </div>
  )
}
