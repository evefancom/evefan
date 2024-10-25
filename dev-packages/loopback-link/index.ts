// TODO: Move me into opensdks
import type {AddressInfo} from 'node:net'
import {serve} from '@hono/node-server'
import type {Link as FetchLink} from '@opensdks/fetch-links'
import {modifyRequest} from '@opensdks/fetch-links'

interface ServeOptions {
  /** defaults to 0 which is a random port */
  port?: number
}

export function serveAsync(
  handler: (request: Request) => Promise<Response>,
  opts: ServeOptions = {},
) {
  console.log('Serving', opts)
  return new Promise<AddressInfo & {close: () => Promise<void>}>((resolve) => {
    // 0 means random
    const server = serve({fetch: handler, port: opts.port ?? 0}, (info) =>
      resolve({
        ...info,
        close: () =>
          // eslint-disable-next-line promise/param-names
          new Promise((res, rej) =>
            server.close((err) => (err ? rej(err) : res())),
          ),
      }),
    )
  })
}

// TODO: Add option for re-using the server between requests
export const loopbackLink =
  (opts?: ServeOptions): FetchLink =>
  async (req, next) => {
    const server = await serveAsync(next, opts)
    const res = await fetch(
      modifyRequest(req, {
        url: {hostname: 'localhost', port: server.port.toString()},
      }),
    )
    await server.close()
    return res
  }

// void serveAsync(async () => new Response('👋')).then((info) => {
//   console.log(`Server running at ${info.address}:${info.port}`)
// })
