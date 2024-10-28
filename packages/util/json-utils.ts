import type {Json} from './zod-utils'

export {stringify as javascriptStringify} from 'javascript-stringify'
export {default as stableStringify} from 'json-stable-stringify'
export {default as compactStringify} from 'json-stringify-pretty-compact'

/** @returns as Json technically. but breaks a bunch of types, so ...  */
export function safeJSONParse(str: string | null | undefined) {
  try {
    return str ? (JSON.parse(str) as Json) : undefined
  } catch {
    // console.warn('Failed to parse JSON', str, err)
    return undefined
  }
}

export function safeJSONStringify(obj: unknown) {
  try {
    return obj === undefined ? undefined : JSON.stringify(obj)
  } catch {
    // console.warn('Failed to parse JSON', str, err)
    return undefined
  }
}
