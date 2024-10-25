declare namespace AlphaVantage {
  // Stock
  export interface TimeSeriesMonthlyResponse {
    'Meta Data': {
      '1. Information': string
      '2. Symbol': string
      '3. Last Refreshed': string
      '4. Time Zone': string
    }
    'Monthly Time Series': MonthlyTimeSeries
  }

  export type MonthlyTimeSeries = Record<
    string /** ISODate */,
    {
      '1. open': string
      '2. high': string
      '3. low': string
      '4. close': string
      '5. volume': string
    }
  >

  // Forex
  export interface FxMonthlyResponse {
    'Meta Data': {
      '1. Information': string
      '2. From Symbol': string
      '3. To Symbol': string
      '4. Last Refreshed': string
      '5. Time Zone': string
    }
    'Time Series FX (Monthly)': TimeSeriesFxMonthly
  }

  export type TimeSeriesFxMonthly = Record<
    string /** ISODate */,
    {
      '1. open': string
      '2. high': string
      '3. low': string
      '4. close': string
    }
  >

  // Crypto
  export interface DigitalCurrencyMonthlyResponse {
    'Meta Data': {
      '1. Information': string
      '2. Digital Currency Code': string
      '3. Digital Currency Name': string
      '4. Market Code': string
      '5. Market Name': string
      '6. Last Refreshed': string
      '7. Time Zone': string
    }
    'Time Series (Digital Currency Monthly)': TimeSeriesDigitalCurrencyMonthly
  }
  export type TimeSeriesDigitalCurrencyMonthly = Record<
    string /** ISODate */,
    {
      '1a. open (USD)': string
      '1b. open (USD)': string
      '2a. high (USD)': string
      '2b. high (USD)': string
      '3a. low (USD)': string
      '3b. low (USD)': string
      '4a. close (USD)': string
      '4b. close (USD)': string
      '5. volume': string
      '6. market cap (USD)': string
    }
  >
}
