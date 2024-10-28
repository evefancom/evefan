import type {HTTPError} from '@openint/util'
import {
  createHTTPClient,
  stringifyQueryParams,
  z,
  zFunction,
} from '@openint/util'

export const zConfig = z.object({
  authToken: z.string().nullish(),
})

export const makeExpensifyClient = zFunction(zConfig, (_cfg) => {
  const http = createHTTPClient({
    baseURL: 'https://www.expensify.com/api',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
    },
    requestTransformer: (req) => req,
    errorTransformer: (err) => {
      if (err?.response?.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
        return new ExpensifyError(err.response.data as any, err)
      }
      return err
    },
  })

  async function runCommand<T>(command: string, data: Record<string, unknown>) {
    return http
      .post<T>(
        '',
        stringifyQueryParams({
          appversion: '8.5.5.0',
          partnerName: 'iphone',
          partnerPassword: 'e88ed31140a66c73b36a',
          referer: 'iPhone',
          useExpensifyLogin: 'true',
          ...data,
          command,
        }),
      )
      .then((r) => r.data)
  }
  async function authenticate(input: {email: string; password: string}) {
    return runCommand<Expensify.AuthenticateResponse>('Authenticate', {
      partnerUserID: input.email,
      partnerUserSecret: input.password,
    })
  }

  return {
    runCommand,
    authenticate,
  }
})

export class ExpensifyError extends Error {
  override name = 'ExpensifyError'

  constructor(
    public readonly data: {
      errorCode?: unknown
      errorMessage?: unknown
      [k: string]: unknown
    },
    public readonly originalError: HTTPError,
  ) {
    super(`[${data.errorCode}] ${data.errorMessage}`)
    Object.setPrototypeOf(this, ExpensifyError.prototype)
  }
}
