declare module '@blossomfinance/iso-4217-currencies' {
  export interface CurrencyInfo {
    symbol: string
    name: string
    symbolNative: string
    decimalDigits: number
    rounding: number
    code: string
    namePlural: string
  }

  export const map: Record<string /* Symbol */, CurrencyInfo>
  export const codes: string[]
  export const currencies: CurrencyInfo[]
}
