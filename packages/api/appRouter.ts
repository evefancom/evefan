// not sure about directly depending on vdk from api, but anyways
import type {
  ZodOpenApiComponentsObject,
  ZodOpenApiPathsObject,
} from '@lilyrose2798/trpc-openapi/dist/generator'
import {generateOpenApiDocument} from '@lilyrose2798/trpc-openapi/dist/generator'
import {getServerUrl} from '@openint/app-config/constants'
import {flatRouter, outgoingWebhookEventMap} from '@openint/engine-backend'
import accountingRouter from '@openint/unified-accounting'
import atsRouter from '@openint/unified-ats'
import bankingRouter from '@openint/unified-banking'
import {crmRouter} from '@openint/unified-crm'
import eltRouter from '@openint/unified-etl'
import hrisRouter from '@openint/unified-hris'
import ptaRouter from '@openint/unified-pta'
import {salesEngagementRouter} from '@openint/unified-sales-engagement'
import {mapKeys, mapValues, publicProcedure, trpc, z} from '@openint/vdk'
import {authRouter} from './authRouter'

export const publicRouter = trpc.router({
  getOpenapiDocument: publicProcedure
    .meta({openapi: {method: 'GET', path: '/openapi.json'}})
    .input(z.void())
    .output(z.unknown())
    .query((): unknown => getOpenAPISpec()),
})

export const _appRouter = trpc.router({
  public: publicRouter,
  // Verticals
  salesEngagement: salesEngagementRouter,
  crm: crmRouter,
  banking: bankingRouter,
  accounting: accountingRouter,
  pta: ptaRouter,
  ats: atsRouter,
  hris: hrisRouter,
  etl: eltRouter,
})

export const appRouter = trpc.mergeRouters(flatRouter, authRouter, _appRouter)

export type AppRouter = typeof appRouter

function assertNoSlash(name: string) {
  if (name.includes('/')) {
    throw new Error(`Event name ${name} containing '/' is not supported`)
  }
  return name
}

export function oasWebhooksEventsMap(
  eMap: Record<string, {data: z.AnyZodObject}>,
) {
  const webhooks = mapValues(
    eMap,
    (_, name): ZodOpenApiPathsObject[string] => ({
      post: {
        requestBody: {
          content: {
            'application/json': {
              schema: {
                $ref: `#/components/schemas/webhooks.${assertNoSlash(name)}`,
              },
            },
          },
        },
        responses: {},
      },
    }),
  )
  type Schemas = NonNullable<ZodOpenApiComponentsObject['schemas']>
  const components = {
    schemas: mapKeys(
      mapValues(eMap, (shape, name): Schemas[string] =>
        z.object({...shape, name: z.literal(name), id: z.string().optional()}),
      ),
      (name) => `webhooks.${name}`,
    ),
  }
  return {webhooks, components}
}

export function getOpenAPISpec() {
  const {webhooks, components} = oasWebhooksEventsMap(outgoingWebhookEventMap)
  const oas = generateOpenApiDocument(appRouter, {
    openApiVersion: '3.1.0', // Want jsonschema
    title: 'OpenInt OpenAPI',
    version: '0.0.0',
    securitySchemes: {
      apikey: {
        type: 'apiKey',
        name: 'x-apikey',
        in: 'header',
      },
      resourceId: {
        type: 'apiKey',
        name: 'x-resource-id',
        in: 'header',
      },
    },
    baseUrl: getServerUrl(null) + '/api/v0',
    webhooks,
    components,
  })
  // Unfortunately trpc-openapi is missing bunch of options...
  oas.security = [{apikey: [], resourceId: []}]
  return oas
}

if (require.main === module) {
  console.log(JSON.stringify(getOpenAPISpec(), null, 2))
}
