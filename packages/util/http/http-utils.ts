import type http from 'node:http'
import type https from 'node:https'
import type {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError as IAxiosError,
  Method,
} from 'axios'
import _Axios from 'axios'
import {defineProxyFn} from '../di-utils'

export {default as Axios} from 'axios'
export type {AxiosError as IAxiosError} from 'axios'

// MARK: - Proxy Agent

export const $makeProxyAgent = defineProxyFn<
  (opts: {url: string; cert: string}) => http.Agent | https.Agent | undefined
>('$makeProxyAgent', () => {
  console.warn(
    '$makeProxyAgent stub invoked, proxy will be undefined. Did you forget to register.node?',
  )
  return undefined
})

export function getDefaultProxyAgent() {
  return process.env['USE_PROXY_AGENT']
    ? $makeProxyAgent({
        url: process.env['PROXY_URL'] ?? '',
        cert: process.env['PROXY_CERT'] ?? '',
      })
    : undefined
}

/**
 * Axios request headers are upper case while response headers are lowercase.
 * @see https://cl.ly/5626359924fa This behavior is not documented so
 * instead we make everything lowercase for our own safety
 */
function lowercaseHeaders(headers: Record<string, unknown>) {
  const newHeaders: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(headers)) {
    newHeaders[key.toLowerCase()] = value
  }
  return newHeaders
}

const logger = console

// MARK: - HTTPClient

export type HTTPRequestConfig = AxiosRequestConfig

export class HTTPError<
  TRequestData = unknown,
  TResponseData = unknown,
> extends Error {
  static create(err: IAxiosError) {
    // Workaround for the axios inconsistency where data would have been serialized
    // by the time it reaches this stage
    // Notably, axios response seems to return `JSON.parse`d data
    const requestHeaders = lowercaseHeaders(
      err.config.headers as Record<string, unknown>,
    ) as Record<string, string>
    let requestData = err.config.data as unknown
    if (
      requestHeaders['content-type']?.startsWith('application/json') &&
      typeof requestData === 'string'
    ) {
      try {
        requestData = JSON.parse(requestData)
      } catch (err_) {
        logger.warn(err_, 'HTTPError JSON requestData parsing hack failed')
      }
    }

    return new HTTPError(
      {
        // TODO: Verify that `method` and `url` always exists
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        method: err.config.method!,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        url: err.config.url!,
        headers: requestHeaders,
        data: requestData,
      },
      // https://stackoverflow.com/questions/39153080/how-can-i-get-the-status-code-from-an-http-error-in-axios
      err.response && {
        status: err.response.status,
        statusText: err.response.statusText,
        data: err.response.data as unknown,
        headers: lowercaseHeaders(
          err.response.headers as Record<string, unknown>,
        ) as Record<string, string>,
      },
      err.message,
    )
  }

  override name = 'HTTPError'

  get code() {
    return this.response?.status
  }

  constructor(
    public readonly request: {
      method: Method
      url: string
      headers: Record<string, string>
      data: TRequestData
    },
    public readonly response:
      | {
          status: number
          statusText: string
          headers: Record<string, string>
          data: TResponseData
        }
      | undefined,
    public readonly originalMessage: string,
  ) {
    super(
      `${request.method.toUpperCase()} ${request.url} failed with ${
        response
          ? `HTTP ${response.status} ${response.statusText}`
          : originalMessage
      }`,
    )
    Object.setPrototypeOf(this, HTTPError.prototype)
  }
}

export type HTTPClient = AxiosInstance

/**
 * TODO: Replace reimplementation to use fetch instead, among other things it is used
 * by https://www.npmjs.com/package/api / https://api.readme.dev/docs (which is awesome by the way)
 * and will allow us to better integrate
 */
export function createHTTPClient({
  requestTransformer,
  responseTransformer,
  errorTransformer,
  refreshAuth,
  httpsAgent,
  ...config
}: Omit<
  AxiosRequestConfig,
  // httpAgent doesn't work and is thus confusing..
  'transformRequest' | 'transformResponse' | 'httpAgent'
> & {
  requestTransformer?: (
    req: AxiosRequestConfig,
  ) => AxiosRequestConfig | Promise<AxiosRequestConfig>
  responseTransformer?: (res: AxiosResponse) => AxiosResponse
  errorTransformer?: (err: HTTPError) => Error
  /**
   * If provided, will retry. To skip refreshing, return undefined
   * Inspired by https://stackoverflow.com/questions/51563821/axios-interceptors-retry-original-request-and-access-original-promise
   * https://github.com/Flyrell/axios-auth-refresh
   * */
  refreshAuth?: {
    /** `err` is undefined if we are proactively refreshing. Return false */
    refresh: (err?: HTTPError) => Promise<boolean | void> | undefined
    /** For situations where we know a token has likely expired */
    shouldProactiveRefresh?: (req: AxiosRequestConfig) => boolean
    /** Should return true for the refresh request itself... */
    shouldSkipRefresh?: (req: AxiosRequestConfig) => boolean
  }
}): HTTPClient {
  let refreshPromise: Promise<boolean | void> | undefined

  const axios = _Axios.create({
    // How do we use per request container here?
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    httpsAgent: httpsAgent ?? getDefaultProxyAgent(),
    ...config,
  })
  if (requestTransformer) {
    axios.interceptors.request.use(requestTransformer)
  }
  // WARNING: https://github.com/axios/axios/issues/1663 Axios interceptors
  // are applied in reverse. Uuslaly we may need to refreshAuth before transforming
  // requests (such as Authorization header...)
  if (refreshAuth) {
    axios.interceptors.request.use((req) => {
      if (refreshAuth.shouldSkipRefresh?.(req)) {
        return req
      }
      if (!refreshPromise && refreshAuth.shouldProactiveRefresh?.(req)) {
        refreshPromise = refreshAuth.refresh()
      }
      return refreshPromise
        ? refreshPromise
            .finally(() => (refreshPromise = undefined))
            .catch((err) => {
              console.warn('[http] Failed to refresh auth', err)
              // eslint-disable-next-line @typescript-eslint/no-throw-literal
              throw new _Axios.Cancel('Failed to refresh auth')
            })
            .then(() => req)
        : req
    })
  }
  // TODO: Add test for transforming response error into
  axios.interceptors.response.use(
    (res) => {
      if (responseTransformer) {
        return responseTransformer(res)
      }
      return res
    },
    (err: IAxiosError) => {
      if (!err.isAxiosError) {
        throw err
      }
      const error = HTTPError.create(err)
      if (error.code === 401 && refreshAuth && !refreshPromise) {
        refreshPromise = refreshAuth.refresh(error)
        if (refreshPromise) {
          // eslint-disable-next-line promise/no-promise-in-callback
          return refreshPromise
            .finally(() => (refreshPromise = undefined))
            .then((res) => {
              if (res === false) {
                throw errorTransformer ? errorTransformer(error) : error
              }
              return axios.request(err.response?.config ?? {})
            })
        }
      }
      throw errorTransformer ? errorTransformer(error) : error
    },
  )
  return axios
}
