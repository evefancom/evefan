import type {Amount, AnyAmount} from './amount-utils'
import {A} from './amount-utils'
import type {
  _CustomFormatAmountOptions,
  FormatAmountOptions,
} from './formatting-amount'
import {
  _customFormatAmount,
  _formatSingleAmount,
  formatAmount,
} from './formatting-amount'
import type {StrictIntlNumberFormatOptions} from './formatting-number'

// Reason we have our custom number format is that there are no style that appends unit at the end
// prettier-ignore
test.each<
  [number, string, StrictIntlNumberFormatOptions, string | undefined]
>([
  // Style
  [100, '100', {currency: 'USD'}, undefined], // currency is ignored, decimal is default
  [100, '100', {style: 'decimal', currency: 'USD'}, undefined], // currency is ignored
  [100, '100 yrs', {style: 'unit', unit: 'year'}, undefined], // currency is ignored, unit is required
  [100, '10,000%', {style: 'percent'}, undefined], // Currency is ignored
  [100, '$100.00', {style: 'currency', currency: 'USD'}, undefined],
  // Currrency
  [100, 'BTC 100.00', {style: 'currency', currency: 'BTC'}, undefined],
  [100, 'RangeError: Invalid currency code : SESSION', {style: 'currency', currency: 'SESSION'}, undefined], // Invalid currency

  // Digits
  [100.153, '$100.15', {style: 'currency', currency: 'USD'}, undefined],
  [-399.99999999356993, '-$400.00', {style: 'currency', currency: 'USD'}, undefined], // Something we suffered from before
  [100, '$100', {style: 'currency', currency: 'USD', minimumFractionDigits: 0}, undefined],
  [100.1532, '$100.153', {style: 'currency', currency: 'USD', maximumFractionDigits: 3}, undefined],
  // Locale
  [100, 'CA$100.00', {style: 'currency', currency: 'CAD'}, 'en-US'],
  [100, '$100.00', {style: 'currency', currency: 'CAD'}, 'en-CA'],
  [100, 'US$100.00', {style: 'currency', currency: 'USD'}, 'en-CA'],
  [100, 'US$100,00', {style: 'currency', currency: 'USD'}, 'id-ID'],
  // Currency display
  [100, 'USD 100.00', {style: 'currency', currency: 'USD', currencyDisplay: 'code'}, 'en-CA'],
  // This one is flaky, somehow it shows up as 1) version on CI and 2) version locally...
  // [100, '100.00 US dollars', {style: 'currency', currency: 'USD', currencyDisplay: 'name'}, 'en-CA'],
  // [100, '100.00 U.S. dollars', {style: 'currency', currency: 'USD', currencyDisplay: 'name'}, 'en-CA'],
  [100, 'US$100.00', {style: 'currency', currency: 'USD', currencyDisplay: 'symbol'}, 'en-CA'],
  // This particular test is unreliable for some reason... Works differently on CI vs local
  // [100, 'US$100.00', {style: 'currency', currency: 'USD', currencyDisplay: 'narrowSymbol'}, 'en-CA'],
  [100, 'BTC 100.00', {style: 'currency', currency: 'BTC', currencyDisplay: 'narrowSymbol'}, 'en-US'], // pretty poor BTC support
  // Currency sign
  [-100, '-$100.00', {style: 'currency', currency: 'USD', currencySign: 'standard'}, undefined],
  [-100, '($100.00)', {style: 'currency', currency: 'USD', currencySign: 'accounting'}, undefined],
  // Sign display
  [-100, '-$100.00', {style: 'currency', currency: 'USD', signDisplay: 'auto'}, undefined], // negative only
  [100, '+$100.00', {style: 'currency', currency: 'USD', signDisplay: 'always'}, undefined],
  [0, '$0.00', {style: 'currency', currency: 'USD', signDisplay: 'exceptZero'}, undefined],
  [-100, '$100.00', {style: 'currency', currency: 'USD', signDisplay: 'never'}, undefined],
  // IDR cases
  [100, 'IDR 100.00', {style: 'currency', currency: 'IDR'}, 'en-US'],
  [100, 'Rp 100.00', {style: 'currency', currency: 'IDR', currencyDisplay: 'narrowSymbol'}, 'en-US'],
  [1_000_000, 'IDR 1,000,000', {style: 'currency', currency: 'IDR', currencyDisplay: 'symbol', minimumFractionDigits: 0}, 'en-US'],
  [1_000_000, 'Rp 1,000,000.00', {style: 'currency', currency: 'IDR', currencyDisplay: 'narrowSymbol'}, 'en-US'],
  [100, 'Rp 100,00', {style: 'currency', currency: 'IDR'}, 'id-ID'],
  [1_000_000, 'Rp 1.000.000,00', {style: 'currency', currency: 'IDR'}, 'id-ID'],
  // Desired - Unit-less
  [1_000_000, '1,000,000', {style: 'decimal'}, 'en-US'],
  [1_000_000, '1.000.000', {style: 'decimal'}, 'id-ID'],
  // Desired - With unit
  // narrowSymbol can be a problem because CA$ and US$ can no longer be told apart...
  [1_000_000, 'Rp 1,000,000', {style: 'currency', currency: 'IDR', currencyDisplay: 'narrowSymbol', minimumFractionDigits: 0}, 'en-US'],
  [1_000_000, 'Rp 1.000.000', {style: 'currency', currency: 'IDR', currencyDisplay: 'narrowSymbol', minimumFractionDigits: 0}, 'id-ID'],
  [1_000_000.52, 'Rp 1,000,000.52', {style: 'currency', currency: 'IDR', currencyDisplay: 'narrowSymbol', minimumFractionDigits: 0}, 'en-US'],
  [1_000_000.5, 'Rp 1.000.000,5', {style: 'currency', currency: 'IDR', currencyDisplay: 'narrowSymbol', minimumFractionDigits: 0}, 'id-ID'],

])('Intl.NumberFormat %p -> %p via (%p %p)', (number, result, options, locales,) => {
  let out = ''
  try {
    const formatter = new Intl.NumberFormat(locales, options)
    out = formatter.format(number)
  } catch (err) {
    out = `${err}`
  }
  expect(out).toEqual(result)
})

test.each<[Amount, string, _CustomFormatAmountOptions]>([
  [A(100, 'Session'), '100 Session', {}],
  [A(100, 'Session'), '100 Sessions', {pluralize: true}],
  [A(100, 'USD'), '100 USD', {}],
])('_customFormatAmount %p -> %p with %p', (input, output, options) => {
  expect(_customFormatAmount(input, options)).toEqual(output)
})

test.each<[Amount, string]>([
  [A(100, 'Session'), '100 Session'],
  [A(100, 'USD'), '$100.00'],
])('_formatSingleAmount %p -> %p', (input, output) => {
  expect(_formatSingleAmount(input)).toEqual(output)
})

test.each<[AnyAmount, string, FormatAmountOptions]>([
  [A(100, 'Session'), '100 Session', {}],
  [{USD: 100}, '$100.00', {}],
  [{SESSION: 5}, '+5 SESSION', {signDisplay: 'always'}],
  [{USD: 100, IDR: 323_231, ALKA: 3}, '$100.00; Rp 323,231; 3 ALKA', {}],
  [
    {USD: 100, IDR: 323_231, ALKA: 3},
    '$100.00; Rp 323,231; 3 ALKA',
    {currencyDisplay: 'narrowSymbol'},
  ],
  [
    {USD: 100, IDR: 323_231, ALKA: 3},
    'US$100,00; Rp 323.231; 3 ALKA',
    {locales: 'id-ID'},
  ],
])('formatAnyAmount %p -> %p with %p', (input, output, options) => {
  expect(formatAmount(input, options)).toEqual(output)
})
