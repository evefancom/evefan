declare namespace Beancount {
  export interface JSONExport {
    variant: 'beancount'
    version: string
    entries: WrappedEntry[]
    errors: Array<{
      source: {filename: string; lineno: number}
      message: string
      entry: unknown | null
    }>
    options: Partial<Options>
  }

  export type WrappedEntry =
    | {type: 'Commodity'; entry: Commodity; hash?: string}
    | {type: 'Open'; entry: Open; hash?: string}
    | {type: 'Balance'; entry: Balance; hash?: string}
    | {type: 'Transaction'; entry: Transaction; hash?: string}
    | {type: 'Event'; entry: Event; hash?: string}
    | {type: 'Price'; entry: Price; hash?: string}
    | {type: 'Document'; entry: Document; hash?: string}
    | {type: 'Pad'; entry: Pad; hash?: string}

  // Plugin?

  export interface Directive {
    /** Always exists in beancount, but not required */
    meta?: Meta
    /** It doesn't actually exist in `directive`. We're gonna merge it in */
    hash?: string
  }

  export interface Meta {
    /** Exists when parsing from beancount, not when sending to */
    filename?: string
    /** Exists when parsing from beancount, not when sending to */
    lineno?: number
    export?: string
    __tolerances__?: Record<string, number | undefined>
    [k: string]: unknown
  }

  export interface Commodity extends Directive {
    date: string
    currency: string
  }

  export interface Open extends Directive {
    date: string
    account: string
    currencies?: string[]
    booking: unknown
  }

  export interface Balance extends Directive {
    date: string
    account: string
    amount: Units
    tolerance?: unknown
    diff_amount?: unknown
  }

  export interface Pad extends Directive {
    date: string
    account: string
    source_account: string
  }
  export interface Document extends Directive {
    date: string
    account: string
    filename: string
    tags: string[]
    links: string[]
  }

  export interface Event extends Directive {
    date: string
    type: string
    description: string
  }

  export interface Price extends Directive {
    date: string
    currency: string
    amount: Units
  }

  export interface Transaction extends Directive {
    date: string
    flag: string
    payee?: string | null
    narration: string
    tags: string[]
    links: string[]
    postings: Posting[]
  }

  export interface Posting {
    account: string
    units: Units | null
    cost?: Cost | null
    price?: Units
    flag?: string | null
    meta?: Record<string, unknown>
  }

  export interface Units {
    number: number
    currency: string
  }

  export interface Cost extends Units {
    date?: string
    label?: string
  }

  export interface Options {
    filename: string
    /**
     * "include": [
     *    "/Users/tony/Code/tonyxiao/financials/temp/bean-dest-test/2022-06.bean"
     *  ],
     */
    include: string[]
    input_hash: string
    dcontext: unknown
    commodities: string[]
    plugin: unknown[]
    title: string
    name_assets: string
    name_liabilities: string
    name_equity: string
    name_income: string
    name_expenses: string
    account_previous_balances: string
    account_previous_earnings: string
    account_previous_conversions: string
    account_current_earnings: string
    account_current_conversions: string
    account_rounding: unknown
    conversion_currency: string
    /** e.g. "inferred_tolerance_default": {"IDR": 100}, */
    inferred_tolerance_default: Record<string, number>
    inferred_tolerance_multiplier: number
    infer_tolerance_from_cost: boolean
    documents: unknown[]
    operating_currency: string[]
    render_commas: boolean
    plugin_processing_mode: string
    long_string_maxlines: number
    booking_method: unknown
    allow_pipe_separator: boolean
    allow_deprecated_none_for_tags_and_links: boolean
    insert_pythonpath: boolean
  }
}
