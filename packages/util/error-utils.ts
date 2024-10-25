import {BaseError as _BaseError} from 'make-error'

import {javascriptStringify} from './json-utils'
import {isPlainObject} from './object-utils'

export {BaseError} from 'make-error'

export default class RichError extends _BaseError {
  info?: Record<string, unknown>

  constructor(message: string, info?: Record<string, unknown>) {
    super(message)
    this.info = info
  }
}

export function normalizeError(err: unknown) {
  if (err instanceof Error) {
    return err
  }
  if (isPlainObject(err)) {
    return new RichError(getErrorMessage(err), err)
  }
  return new Error(getErrorMessage(err))
}

export function getErrorMessage(err: unknown) {
  if (typeof err === 'string') {
    return err
  }
  if (!!err && typeof err === 'object') {
    if ('message' in err) {
      return (err as {message: string}).message
    }
  }
  return javascriptStringify(err) ?? '<Error>'
}

export function getLocalizedErrorMessage(err: unknown) {
  if (typeof err === 'string') {
    return err
  }
  if (!!err && typeof err === 'object') {
    if ('localizedMessage' in err) {
      return (err as {localizedMessage: string}).localizedMessage
    }
    if ('message' in err) {
      return (err as {message: string}).message
    }
  }
  return 'Something went wrong'
}
