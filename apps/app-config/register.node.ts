// @deprecated Most likely no longer serves any purpose now that integrations
// have different entry points for client vs. server

// Polyfill fetch on node to support proxy agent...
// Should we use node-fetch directly?

import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import url from 'node:url'
import chokidar from 'chokidar'
import crossFetch, {Headers, Request, Response} from 'cross-fetch'
import {readFile} from 'read-file-safe'
import tunnel from 'tunnel'
import {writeFile as _writeFile} from 'write-file-safe'
import {
  $appendFile,
  $chokidar,
  $ensureDir,
  $execCommand,
  $fs,
  $makeProxyAgent,
  $path,
  $readFile,
  $writeFile,
  implementProxyFn,
  memoize,
} from '@openint/util'

/**
 * Do not relace global version unnecessarily.
 * causes among other issue clerk/nextjs to fail mysteriously
 * @see https://share.cleanshot.com/BcYr73DF
 */
if (!globalThis.fetch) {
  globalThis.fetch = crossFetch
  globalThis.Headers = Headers
  globalThis.Request = Request
  globalThis.Response = Response
}

if (process.env['SILENT']) {
  console.log = () => {} // To suppress spurious log
  console.debug = () => {} // To suppress spurious log
  console.info = () => {} // To suppress spurious log
}

console.log('[Dep] app-config/register.node')

implementProxyFn(
  $makeProxyAgent,
  (input) => {
    // Seems that the default value get overwritten by explicit undefined
    // value from envkey. Here we try to account for that
    // Would be nice if such hack is not required.
    const {hostname, port, auth} = url.parse(input.url)
    if (!hostname || !port) {
      return undefined
    }
    // Alternative workaround for https://github.com/motdotla/dotenv/issues/664
    // Workaround for when newline in certs gets lost... due to the same dotenv issue...
    // Maybe we should really hack dotenv instead
    // let cert = input.cert
    // if (cert && !cert.includes('\n')) {
    //   cert = [
    //     '-----BEGIN CERTIFICATE-----',
    //     ...R.chunk(
    //       cert
    //         .replace(/^-----BEGIN CERTIFICATE-----/, '')
    //         .replace(/-----END CERTIFICATE-----$/, '')
    //         .split(''),
    //       64,
    //     ).map((l) => l.join('')),
    //     '-----END CERTIFICATE-----',
    //   ].join('\n')
    // }

    return tunnel.httpsOverHttp({
      ca: input.cert ? [Buffer.from(input.cert)] : [],
      proxy: {
        host: hostname,
        port: Number.parseInt(port, 10),
        proxyAuth: auth ?? undefined,
        headers: {},
      },
    })
  },
  {replaceExisting: true},
)

implementProxyFn(
  $execCommand,
  (command, stdin) =>
    import('execa').then(({execaCommand}) =>
      execaCommand(command, {input: stdin}),
    ),
  {replaceExisting: true}, // Prevent error in case we are already registered
)

implementProxyFn(
  $appendFile,
  async (filePath, content) => {
    console.log(`Will append file to ${filePath}`)
    await fs.appendFile(filePath, content)
  },
  {replaceExisting: true},
)

implementProxyFn(
  $ensureDir,
  memoize(
    async (dir: string) => {
      await fs.mkdir(dir, {recursive: true})
    },
    {isPromise: true},
  ),
)

implementProxyFn($fs, () => fs)
implementProxyFn($path, () => path)
implementProxyFn($chokidar, () => chokidar)
implementProxyFn($readFile, readFile, {replaceExisting: true})

/**
 * Remember to set the TMPDIR env var if we are running on a separate volume (e.g. case-sensitive volume)
 * ❯ node -e "process.env.TMPDIR='/11234'; console.log(require('os').tmpdir())"
 *  /11234
 */
implementProxyFn(
  $writeFile,
  async (filePath, ...args) => {
    console.debug(`Will write file ${filePath}`)
    const ret = await _writeFile(filePath, ...args)
    if (!ret) {
      throw new Error(`Error writing ${filePath}. Check inside write-file-safe`)
    }
    return true
  },
  {replaceExisting: true},
)
