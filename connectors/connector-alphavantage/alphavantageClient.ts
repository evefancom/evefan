import type {HTTPError} from '@openint/util'
import {createHTTPClient, z, zFunction} from '@openint/util'

export const zConfig = z.object({
  baseURL: z.string().nullish(),
  apikey: z.string(),
})

export const makeAlphavantageClient = zFunction(zConfig, (config) => {
  const http = createHTTPClient({
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    baseURL: config.baseURL || 'https://www.alphavantage.co',
    requestTransformer: (req) => {
      req.params = {
        ...(req.params as Record<string, unknown>),
        apikey: config.apikey,
      }
      return req
    },
    errorTransformer: (err) => {
      if (err?.response?.data) {
        return new AlphaVantageError(err.response.data, err)
      }
      return err
    },
  })

  function query<T>(params: {
    function: string
    datatype?: 'json' | 'csv'
    [k: string]: string | undefined
  }) {
    return http.get<T>('query', {params}).then((r) => r.data)
  }

  return {
    getDigitalCurrencyMonthly: zFunction(
      [z.string(), z.string()],
      (symbol, market = 'USD') =>
        query<AlphaVantage.DigitalCurrencyMonthlyResponse>({
          function: 'DIGITAL_CURRENCY_MONTHLY',
          symbol,
          market,
        }),
    ),
    getForexMonthly: zFunction(
      [z.string(), z.string()],
      (from_symbol, to_symbol) =>
        query<AlphaVantage.FxMonthlyResponse>({
          function: 'FX_MONTHLY',
          from_symbol,
          to_symbol,
        }),
    ),
    getTimeSeriesMonthly: zFunction(z.string(), (symbol) =>
      query<AlphaVantage.TimeSeriesMonthlyResponse>({
        function: 'TIME_SERIES_MONTHLY',
        symbol,
      }),
    ),
  }
})

export class AlphaVantageError extends Error {
  override name = 'AlphaVantageError'

  constructor(
    public readonly data: unknown,
    public readonly originalError: HTTPError,
  ) {
    super(`${data}`)
    Object.setPrototypeOf(this, AlphaVantageError.prototype)
  }
}
