import type {Dirent} from 'node:fs'

import {memoize} from './function-utils'
import {$fs, $path, $readFile, $writeFile} from './injected-utils'
import {safeJSONParse, stableStringify} from './json-utils'

export async function safeReadJson(absPath: string) {
  try {
    return await $readFile(absPath).catch(catchENOENT(null)).then(safeJSONParse)
  } catch (err) {
    console.error('Failed to read', absPath)
    throw err
  }
}

/** Use `null` to delete file */
export async function writeJson(absPath: string, data: unknown) {
  if (data == null) {
    await deleteFile(absPath)
    return
  }
  await memoEnsureDir($path().dirname(absPath))
  await $writeFile(absPath, stableStringify(data, {space: 2}))
}

export async function readDir(absPath: string) {
  const files = await $fs()
    .readdir(absPath, {withFileTypes: true})
    .catch(catchENOENT<Dirent[]>([]))

  const filenames = files
    .filter((f) => f.isFile())
    .map((f) => f.name)
    .filter((fn) => !fn.startsWith('.')) // Get rid of things like .DS_Store

  return filenames
}

export async function deleteFile(absPath: string) {
  return $fs().unlink(absPath).catch(catchENOENT(undefined))
}

/** Memoized by default until process exit */
export const memoEnsureDir = memoize(
  async (dir: string) => {
    await $fs().mkdir(dir, {recursive: true})
  },
  {isPromise: true},
)

export function catchENOENT<T>(fallback: T) {
  return (err: unknown) => {
    if (
      err instanceof Error &&
      (err as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      return fallback
    }
    throw err
  }
}
