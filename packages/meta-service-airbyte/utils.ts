import * as path from 'node:path'

export function readJson<T>(filepath: string): T {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return require(path.resolve(process.cwd(), filepath))
}
