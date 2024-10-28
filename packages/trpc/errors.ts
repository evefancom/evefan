import {HTTPError} from '@opensdks/runtime'
import {z} from '@opensdks/util-zod'
import {TRPCError} from '@trpc/server'
import {getHTTPStatusCodeFromError} from '@trpc/server/http'

export {HTTPError}

export const zErrorType = z.enum([
  'USER_ERROR', // authentication & configuration issue for user to fix...
  'REMOTE_ERROR', // remote provider error, corresponds to 5xx codes
  'INTERNAL_ERROR', // Our platform error, corresdponds to 4xx codes
])

export type ErrorType = z.infer<typeof zErrorType>

export class BadRequestError extends TRPCError {
  constructor(message?: string, cause?: unknown) {
    super({code: 'BAD_REQUEST', message, cause})
  }
}
export class NotImplementedError extends TRPCError {
  constructor(message?: string, cause?: unknown) {
    super({code: 'NOT_IMPLEMENTED', message, cause})
  }
}

export class NotFoundError extends TRPCError {
  constructor(message?: string, cause?: unknown) {
    super({code: 'NOT_FOUND', message, cause})
  }
}
export class InternalServerError extends TRPCError {
  constructor(message?: string, cause?: unknown) {
    super({code: 'INTERNAL_SERVER_ERROR', message, cause})
  }
}

/** Refreshing token failed / access revoked */
export class NotAuthenticatedError extends TRPCError {
  // Cannot modify the name as it is used by trpc internals to determine if it's a trpc error...
  // the alternative is to use error.constructor.name instead which works out ok.
  // override name = 'NoLongerAuthenticatedError'

  constructor(
    message?: string,
    cause?: unknown,
    // public readonly customerId: string,
    // public readonly providerName: string,
    // public readonly description: string,
    // public readonly extraInfo: unknown,
  ) {
    super({
      code: 'UNAUTHORIZED',
      message,
      cause,
    })
  }
}

/** e.g. OAuth Scope & mismatch */
export class NotAuthorizedError extends TRPCError {
  constructor(
    public readonly customerId: string,
    public readonly providerName: string,
    public readonly description: string,
    public readonly extraInfo: unknown,
  ) {
    super({
      code: 'FORBIDDEN',
      message: `${customerId}/${providerName}: ${description}`,
    })
  }
}

/** TODO: MOve me into opensdks/runtime */
export function isHttpError<T>(
  err: unknown,
  /** HTTPError code. TODO: Support range... */
  code?: number,
): err is HTTPError<T> {
  if (err instanceof HTTPError) {
    if (code == null || err.code === code) {
      return true
    }
  }
  return false
}

export async function getHTTPResponseFromError(err: TRPCError) {
  const statusCode = getHTTPStatusCodeFromError(err)

  return {
    status: statusCode,
    body: await parseErrorInfo(err),
  }
}

/** Handles error from both within and out of the process. Used for displaying in UI / saving to DB etc. */
export async function parseErrorInfo(err: unknown): Promise<
  | {
      error_type: ErrorType
      error_detail: string
    }
  | undefined
> {
  // Error from hitting our own server from say sdk
  const ourError =
    err instanceof HTTPError ? zTrpcErrorShape.safeParse(err.error) : null
  if (ourError?.success) {
    return {
      error_type:
        // TODO: separate remote provider error from platform error from client error
        ourError.data.class === NotAuthenticatedError.name ||
        ourError.data.class === NotAuthorizedError.name
          ? 'USER_ERROR'
          : 'INTERNAL_ERROR',
      error_detail: [ourError.data.message, `\t-> ${err}`].join('\n'),
    }
  }

  // Error from hitting external servers, including those returned by fetch middlewares
  if (
    err instanceof NotAuthenticatedError ||
    err instanceof NotAuthorizedError
  ) {
    return {error_type: 'USER_ERROR', error_detail: err.message}
  }

  // Anything else non-null would be considered internal error.
  if (err != null) {
    // node:util causes problem with webpack. What we need is a replacement for node:util.format
    // eslint-disable-next-line unicorn/prefer-node-protocol
    const util = await import('util')
    return {
      error_type: 'INTERNAL_ERROR',
      // Let's give stack details for unknown errors like this to help with debugging
      // However this locks us a bit into node js... So would be good to find a replacement at some point
      error_detail: util.format(err),
    }
  }
  return undefined
}

export const zTrpcErrorShape = z.object({
  /** Custom xtended by us */
  class: z.string(),
  code: z.string(),
  message: z.string(),
  data: z.unknown(),
})
