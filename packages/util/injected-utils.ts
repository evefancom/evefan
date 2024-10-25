import {defineProxyFn} from './di-utils'

/** @deprecated */
export const $ensureDir =
  defineProxyFn<(path: string) => Promise<void>>('$ensureDir')

export const $fs = defineProxyFn<() => typeof import('fs/promises')>('$fs')
export const $path = defineProxyFn<() => typeof import('path')>('$path')
export const $chokidar =
  defineProxyFn<() => typeof import('chokidar')>('$chokidar')

export const $execCommand =
  defineProxyFn<
    (cmd: string, stdin?: string) => Promise<{stdout: string; stderr?: string}>
  >('$execCommand')

export const $readFile =
  defineProxyFn<typeof import('read-file-safe').readFile>('$readFile')

/** @returns void technically, false will throw */
export const $writeFile =
  defineProxyFn<typeof import('write-file-safe').writeFile>('$writeFile')

export const $appendFile =
  defineProxyFn<(path: string, content: string) => Promise<void>>('$appendFile')
