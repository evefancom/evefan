import {camelCase as _camelCase, padStart, startCase, upperFirst} from 'lodash'
import type {CamelCase} from 'type-fest'

export {
  // padStart as leftPad, // causes next.js compile errors in 14.4
  snakeCase,
  startCase,
  // upperFirst as upperCaseFirst,
} from 'lodash'
export {default as md5Hash} from 'md5-hex'
export {default as pluralize} from 'pluralize'
export {sentenceCase} from 'sentence-case'

export const leftPad = padStart
export const upperCaseFirst = upperFirst

/** Adapted from https://github.com/esamattis/underscore.string/blob/master/titleize.js */
export function titleCase(str: string | undefined) {
  return startCase(str)
    .toLowerCase()
    .replace(/(?:^|\s|-)\S/g, (c) => c.toUpperCase())
}

export function camelCase<T extends string>(str: T) {
  return _camelCase(str) as CamelCase<T>
}
