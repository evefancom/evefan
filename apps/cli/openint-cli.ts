#!/usr/bin/env tsx
import '@openint/app-config/register.node'
import http from 'node:http'
import {nodeHTTPRequestHandler} from '@trpc/server/adapters/node-http'
import {json} from 'micro'
import ngrok from 'ngrok'
import {contextFactory} from '@openint/app-config/backendConfig'
import type {EndUserId, Id, UserId} from '@openint/cdk'
import {flatRouter, parseWebhookRequest} from '@openint/engine-backend'
import type {NonEmptyArray} from '@openint/util'
import {parseUrl, R, z, zFunction, zodInsecureDebug} from '@openint/util'
import {cliFromRouter} from './cli-utils'

if (!process.env['DEBUG']) {
  console.debug = () => {} // Disabling debug logs
}
if (process.env['DEBUG_ZOD']) {
  zodInsecureDebug()
}

const {USER_ID, END_USER_ID, ORG_ID, SYSTEM, X_RESOURCE_ID} = process.env
const endUserId = END_USER_ID as EndUserId | undefined
const userId = USER_ID as UserId | undefined
const orgId = ORG_ID as Id['org'] | undefined

export const cli = cliFromRouter(flatRouter, {
  cleanup: () => {}, // metaService.shutdown?
  // Bypass auth when running sync from CLI
  // We should improve this for usage on single machines
  context: {
    ...contextFactory.fromViewer(
      endUserId && orgId
        ? {role: 'end_user', endUserId, orgId}
        : userId
          ? {role: 'user', userId}
          : orgId
            ? {role: 'org', orgId}
            : SYSTEM
              ? {role: 'system'}
              : {role: 'anon'},
    ),
    remoteResourceId: X_RESOURCE_ID as Id['reso'],
  },
  // syncEngine.zContext.parse<'typed'>({
  //   accessToken: process.env['ACCESS_TOKEN'],
  // })
})

cli
  .command('serve [port]', 'Creates a standalone server for testing')
  .option('--ngrok', 'Start ngrok tunnel')
  .action(
    zFunction(
      [z.number().default(4005), z.object({ngrok: z.boolean().nullish()})],
      async (port, opts) => {
        const server = new http.Server(async (req, res) => {
          const {query, segments} = R.pipe(parseUrl(req.url ?? ''), (url) => ({
            query: url.query,
            // compact will remove leading `/`
            segments: R.compact(url.url.split('/')) as NonEmptyArray<string>,
          }))
          let procedure = segments[0]

          if (parseWebhookRequest.isWebhook(segments)) {
            const ret = parseWebhookRequest({
              method: req.method,
              headers: req.headers,
              pathSegments: segments,
              query,
              body: await json(req).catch(() => undefined),
            })
            procedure = ret.procedure
            // @ts-expect-error
            req.query = ret.query
            // @ts-expect-error
            req.body = ret.body // Still need this even for GET since we exhausted the stream otherwise handler will hang
          }
          return nodeHTTPRequestHandler({
            router: flatRouter,
            path: procedure,
            req,
            res,
            createContext: ({req}) => ({
              ...contextFactory.fromJwtToken(
                req.headers.authorization?.match(/^Bearer (.+)/)?.[1],
              ),
              remoteResourceId: req.headers['x-resource-id'] as Id['reso'],
            }),
            // onError: ({error}) => {
            //   // error.message = 'new message...'
            // },
          })
        })

        server.listen(port)

        const actualPort = R.pipe(
          server.address(),
          (addr) => addr as Exclude<typeof addr, string>,
          (addr) => addr?.port ?? port,
        )
        console.log(`listening on port ${actualPort}`)

        if (opts.ngrok) {
          await ngrok.kill()
          // Add subdomain when we support it
          // Only works one at a time due to web-interface being at port 4040 always.
          // To have multiple ngrok instances, use
          // https://stackoverflow.com/questions/36018375/how-to-change-ngroks-web-interface-port-address-not-4040
          const serverUrl = await ngrok.connect({addr: actualPort})
          console.log('ngrok ready at', serverUrl)
          console.log('ngrok web interface', 'http://localhost:4040')
        }
      },
    ),
  )

export default cli

if (require.main === module) {
  cli.help().parse()
}
