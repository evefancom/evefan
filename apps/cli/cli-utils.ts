/* eslint-disable @typescript-eslint/no-unsafe-member-access */

/* eslint-disable @typescript-eslint/no-unsafe-argument */

/* eslint-disable @typescript-eslint/no-unsafe-return */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import fs from 'node:fs'
import path from 'node:path'
import type {AnyRouter} from '@trpc/server'
import cac from 'cac'
import type {AnyZFunction, MaybePromise, z} from '@openint/util'
import {
  deepMerge,
  isAsyncIterable,
  isIterable,
  isZodType,
  parseIf,
  R,
  routerFromZFunctionMap,
  rxjs,
  safeJSONParse,
} from '@openint/util'

function printLine(line: unknown, opts?: {json?: boolean}) {
  if (opts?.json) {
    process.stdout.write(`${JSON.stringify(line)}\n`)
  } else {
    console.log(line)
  }
}

export async function printResult(
  res: unknown,
  opts?: {json?: boolean; minimal?: boolean},
) {
  if (isAsyncIterable(res) || isIterable(res)) {
    for await (const r of res) {
      printLine(r, opts)
    }
  } else if (res instanceof rxjs.Observable) {
    return new Promise<void>((resolve, reject) => {
      res.subscribe({
        next: (r) => {
          printLine(r, opts)
        },
        complete: resolve,
        error: reject,
      })
    })
  } else {
    console.log(res)
    let out = opts?.json ? JSON.stringify(await res) : await res
    if (out && typeof out === 'object' && 'data' in out) {
      out = out.data
    }

    if (opts?.minimal || process.env['SILENT']) {
      // console.log('[printResult]')
      process.stdout.write(`${out}\n`)
      // process.stdout.write('\n')
    } else {
      console.log('[printResult]', out)
    }
  }
}

export async function readStreamToString(stream: NodeJS.ReadStream) {
  const chunks = []
  for await (const chunk of stream) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks).toString('utf8')
}

/**
 * @returns '' if no data passed in
 * @see https://stackoverflow.com/questions/39801643/detect-if-node-receives-stdin
 */
export async function readStdin() {
  return !process.stdin.isTTY ? readStreamToString(process.stdin) : ''
}

export function readFileContent(filename: string, dirname?: string) {
  const filePath = dirname ? path.join(dirname, filename) : filename
  return fs.readFileSync(filePath, 'utf8')
}

// TODO Take router._defs and add options based on it so that docs can be shown
// on the command line.

export interface CliOpts<TContext = unknown> {
  /** Validated methods only... */
  safeMode?: boolean
  prepare?: () => MaybePromise<void>
  cleanup?: () => MaybePromise<void>
  context?: TContext
  defaultHelpCommand?: boolean

  readStdin?: boolean
  jsonOutput?: boolean
  consoleLog?: boolean
}
const globalStart = Date.now() // Not entirely accurate...
export function cliFromRouter<T extends AnyRouter>(
  router: T,
  cliOpts?: CliOpts<Parameters<T['createCaller']>[0]>,
) {
  const cli = cac()
  const log: typeof console.log = (...args) => {
    if (cliOpts?.consoleLog !== false) {
      console.log(...args)
    }
  }
  Object.entries(router._def.procedures).forEach(([name, _procedure]) => {
    // console.debug(`Adding command ${name}`)
    // sub-command is not really working, let's hope we don't have naming conflicts...
    // @see https://share.cleanshot.com/BtVq26
    // Do not name query the same way as we do mutations

    const zTuple = R.pipe(
      parseIf((_procedure as any)._def.inputs[0], isZodType),
      (t) => (t?._def?.typeName === 'ZodTuple' ? (t as z.ZodTuple) : undefined),
    )

    cli
      // This doesn't work very well as it makes the args passed to action disappear
      // Figure out a better type if we can...
      // .command(compact([name, tuple?.items.length && '[...args]']).join(' '))
      .command(`${name} [...args]`)
      .allowUnknownOptions() // No args supported, only options...
      .action(async (args: string[], {'--': _, ...options} = {}) => {
        const input = R.pipe(
          cliOpts?.readStdin !== false
            ? await readStdin().then(safeJSONParse)
            : '',
          (stdin) => deepMerge(stdin ?? {}, options),
          (opts) => R.compact([...args, Object.keys(opts).length > 0 && opts]),
          (arr) => (arr.length <= 1 ? arr[0] : arr),
          // Hacking supporting for tuple of options via --1.name value
          // for up to 4 argments total
          (inpt) => {
            if (typeof inpt !== 'object') {
              return inpt
            }
            const {'1': a1, '2': a2, '3': a3, ...a0} = inpt
            const tuple = [a0, a1, a2, a3]
            while (tuple.length && tuple[tuple.length - 1] === undefined) {
              tuple.pop()
            }
            return tuple.length > 1 ? tuple : inpt
          },
          // Normally we rely on the inputParser inside the router itself to normalize into
          // array with the right # of arguments.
          // However when not creating router directly rather than from zFunctionMap
          // then preprocessing does not happen automatically, causing issue on cli...
          (i) => {
            const tupleItems = zTuple?._def.items
            return !tupleItems
              ? i
              : R.pipe(Array.isArray(i) ? i : [i], (arr) => [
                  ...arr.slice(0, tupleItems.length),
                  ...new Array(Math.max(tupleItems.length - arr.length, 0)),
                ])
          },
        )

        log(`[cli] ${name} input`, input)
        log(`[cli] ${name} start at ${Date.now() - globalStart}ms`)
        const start = Date.now()
        await cliOpts?.prepare?.()
        // We use await here because trpc always return resolver response wrapped in Promise
        // even Observables from subscriptions are wrapped in promise, which
        // does not work very well. Double awaiting shall have no net negative effect
        // so we shall prefer that instead
        // @ts-expect-error
        const res = await router.createCaller(cliOpts?.context)[name](input)

        await printResult(res, {
          json: cliOpts?.jsonOutput,
          minimal: cliOpts?.jsonOutput,
        })
        await cliOpts?.cleanup?.()
        log(`[cli] ${name} done in ${Date.now() - start}ms`)
      })
  })
  // This becomes the default command if user enters nothing at all
  if (cliOpts?.defaultHelpCommand !== false) {
    cli.command('', 'No args to output help').action(() => cli.outputHelp())
  }

  // @ts-expect-error
  cli._router = router

  return cli as typeof cli & {_router: T}
}

export function cliFromZFunctionMap(
  map: Record<string, AnyZFunction | unknown>,
  cliOpts?: CliOpts,
) {
  const cli = cliFromRouter(routerFromZFunctionMap(map), {
    ...cliOpts,
    defaultHelpCommand:
      ('' in map ? false : undefined) ?? cliOpts?.defaultHelpCommand,
  })
  // Expose methods that do not have runtime type defintions also for convenience
  if (!cliOpts?.safeMode) {
    const commandKeys = cli.commands.map((c) => c.name.split(' ')[0])
    for (const name of Object.keys(map).filter(
      (k) => !commandKeys.includes(k),
    )) {
      cli
        .command(`${name} [...args]`)
        .allowUnknownOptions()
        .action(async (args: string[], {'--': _, ...options}) => {
          console.log(`[cli] ${name} args options`, args, options)
          console.log(`[cli] ${name} start at ${Date.now() - globalStart}ms`)
          const start = Date.now()
          await cliOpts?.prepare?.()
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call
          const res: unknown = (map as any)[name](...args, options)
          await printResult(res)
          await cliOpts?.cleanup?.()
          console.log(`[cli] ${name} done in ${Date.now() - start}ms`)
        })
    }
  }
  return cli
}
