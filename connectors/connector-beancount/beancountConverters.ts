import type {Pta} from '@openint/cdk'
import {
  formatAccountType,
  makePostingsMap,
  makePriceKey,
  splitAccountType,
  stdTypeAndEntity,
  TRANSACTION_LABELS,
} from '@openint/cdk'
import type {Amount, NonEmptyArray} from '@openint/util'
import {
  $execCommand,
  A,
  asyncConv,
  conv,
  createHTTPClient,
  DateTime,
  formatDecimal,
  getEnvVar,
  inPlaceSort,
  math,
  objectFromArray,
  objectFromObject,
  R,
  resolveFnIfRegistered,
  shallowOmitUndefined,
  temp_makeId,
  upperCaseFirst,
} from '@openint/util'

// @see https://beancount.github.io/docs/beancount_language_syntax.html
// The general format of a Transaction directive is:
// YYYY-MM-DD [txn|Flag] [[Payee] Narration]
//   [Flag] Account Amount [{Cost}] [@ Price]
//   [Flag] Account Amount [{Cost}] [@ Price]
//   ...
//
// It’s also possible to attach metadata to the transaction and/or any of its postings,
//  so the fully general format is:
// YYYY-MM-DD [txn|Flag] [[Payee] Narration]
//   [Key: Value] ...
//   [Flag] Account Amount [{Cost}] [@ Price]
//     [Key: Value] ...
//   [Flag] Account Amount [{Cost}] [@ Price]
//     [Key: Value] ...
//   ...

const omitTrading = false

function metaFromStandard(
  partial: {
    id?: string | null
    attachmentsMap?: Pta.AttachmentsMap | null
    labelsMap?: Pta.LabelsMap | null
    custom?: Record<string, unknown>
  },
  opts = {includeLabels: true},
) {
  // TODO: Should we clean key and value all in here?
  return shallowOmitUndefined({
    ...(partial.custom &&
      R.pipe(
        partial.custom,
        R.mapValues((v) => cleanValue(`${v}`)),
        R.mapKeys((k) => cleanKey(k)),
      )),
    ...(opts.includeLabels && partial.labelsMap),
    ...objectFromArray(
      inPlaceSort(R.compact(Object.values(partial.attachmentsMap ?? {}))).asc(
        (att) => att.url,
      ),
      (_, index) => (index === 0 ? 'attachment' : `attachment_${index + 1}`),
      (att) => att.url,
    ),
    id: partial.id,
  })
}

function cleanValue(val: string | null | undefined) {
  return val?.replaceAll('\n', '').trim()
}

function cleanKey(label: string, opts?: {allowSlash: boolean}) {
  let out = label.toLowerCase().replace(/[^\d/_a-z]/g, ' ')
  out = (opts?.allowSlash ? out : out.replaceAll('/', ' '))
    .split(' ')
    .filter((s) => !!s)
    .join('_')
  if (!/^[a-z]/.test(out)) {
    out = `z_${out}`
  }
  return out
}

// MARK: - Converters

const convAccountType = conv<string, Pta.AccountType | null | undefined>({
  forward: (type) => {
    const ACCOUNT_TYPE_MAP: Record<string, Pta.AccountType | undefined> = {
      Assets: 'asset',
      Asset: 'asset',
      Liability: 'liability',
      Liabilities: 'liability',
      Equity: 'equity',
      Equities: 'equity',
      Income: 'income',
      Revenue: 'income',
      Expense: 'expense',
      Expenses: 'expense',
    }
    return ACCOUNT_TYPE_MAP[type]
  },
  reverse: (accountType): string => {
    const supertype = accountType && splitAccountType(accountType)[0]
    switch (supertype) {
      case 'asset':
        return 'Assets'
      case 'liability':
        return 'Liabilities'
      case 'equity':
        return 'Equity'
      case 'income':
        return 'Income'
      case 'expense':
        return 'Expenses'
      case undefined:
        return 'Equity' // Uncategorized...
      // Should never happen, but oh well...
      default:
        console.warn(`Unexpected account type ${accountType}`)
        return 'Equity'
    }
  },
})

export function cleanBeancountAccountName(name: string) {
  return (
    name
      // Beancount account names are fairly restrictive.
      // Does not accept underscores even also must start witih capital case
      .replace(/[^A-Za-z0-9/]+/g, ' ')
      .trim()
      .replaceAll(' ', '-')
      .replace(/\//g, ':')
      .split(':')
      .map((n) => n.replace(/^[^A-Za-z0-9/]/, '')) // Leading `-` is not allowed
      .map(upperCaseFirst)
      .join(':')
  )
}

export const convAccountFullName = conv<
  string,
  Pick<Pta.Account, 'name' | 'type' | 'id'>
>({
  forward: (fullName) => {
    const [_type, ...segments] = fullName.split(':')
    const type = _type ? convAccountType(_type) : undefined
    const name = segments.join('/').replaceAll('-', ' ')
    // console.log(`convAccountFullName.forward`, {type, name})
    return {type, name}
  },
  reverse: (acct) =>
    [
      convAccountType.reverse(acct.type),
      cleanBeancountAccountName(
        acct.name || formatAccountType(acct.type ?? 'equity'),
        // Workaround for non-ascii not supported by beancount https://share.cleanshot.com/OvMCfc
      ) || cleanBeancountAccountName(`Unsupported name (${acct.id})`),
    ].join(':'),
})

const convAmount = conv<Beancount.Units, Amount>({
  forward: (units) => A(units.number, convCurrency(units.currency)),
  // TODO: We need to know the decimal places per currency... For now we assume 2.
  reverse: (a) => ({
    currency: convCurrency.reverse(a.unit),
    number: math.round(a.quantity, 2),
  }),
})

/** Beancount currency has a max length... */
const convCurrency = conv<Beancount.Units['currency'], Amount['unit']>({
  forward: (curr) => curr as Unit,
  reverse: (unit) => unit.slice(0, 'PLAID_7DD8KV8OWVUGK4ZQK1'.length),
})

const convCost = conv<Beancount.Posting['cost'], Pta.Posting['cost']>({
  forward: (cost) =>
    cost && {
      type: 'unit', // Think it's always turned into unit cost in the end
      amount: convAmount(cost),
      date: cost.date,
      label: cost.label,
    },
  reverse: (cost) =>
    cost && {
      ...convAmount.reverse(cost.amount),
      date: cost.date,
      label: cost.label,
    },
})

const convReviewStatus = conv<
  string | null | undefined,
  Pta.ReviewStatus | undefined
>({
  forward: (flag) => {
    switch (flag) {
      case '!':
        return 'flagged'
      case '*':
        return 'reviewed'
      case '?':
        return 'unreviewed'
    }
    return undefined
  },
  reverse: (reviewStatus) => {
    switch (reviewStatus) {
      case 'flagged':
        return '!'
      case 'reviewed':
        return '*'
      case 'unreviewed':
        return '?'
    }
    return '?'
  },
})

// TODO: Do this for transactions also
const convPostingLabelsMap = conv<
  Beancount.Posting['meta'],
  Pta.Transaction['labelsMap']
>({
  forward: (meta) =>
    objectFromObject(
      R.omit(meta ?? {}, ['filename', 'lineno', '__automatic__']), // Omit standard beancount meta that is not useful for us as labels
      (_, v) => `${v}`,
    ),
  reverse: (map) =>
    objectFromObject(
      map ?? {},
      (_, v) => v,
      // Beancount meta key has to start with lowercase to be valid
      (k, v) => (v ? cleanKey(k) : undefined),
    ),
})

const convLabelsMap = conv<
  Beancount.Transaction['tags'],
  Pta.Transaction['labelsMap']
>({
  forward: (tags) =>
    objectFromArray(
      tags,
      (name) => name.split('/').slice(0, -1).join('/'),
      (name) => name.split('/').slice(1).pop() ?? true,
    ),
  reverse: (map) => {
    const labels = Object.entries(map ?? {})
      .filter(([, v]) => !!v)
      .map(([k, v]) => (v === true ? k : `${k}/${v}`))
      .map((l) => cleanKey(l, {allowSlash: true}))
    return labels
  },
})

const convPosting = conv<
  Beancount.Posting,
  Pta.Posting,
  never,
  Pta.Posting & {account?: Pta.Account}
>({
  forward: (post) => {
    const acct = convAccountFullName(post.account)
    return {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      amount: convAmount(post.units!),
      accountType: acct.type,
      accountName: acct.name,
      // custom: post.flag ? {flag: post.flag} : undefined, // Enable when needed
      cost: convCost(post.cost),
      price: post.price && {type: 'unit', amount: convAmount(post.price)}, // only unit is supported in beancount
      labelsMap: convPostingLabelsMap(post.meta),
    }
  },
  reverse: (post) => ({
    account: convAccountFullName.reverse(
      ('account' in post && post.account) || {
        id: post.accountId,
        name: post.accountName ?? '',
        type: post.accountType,
      },
    ),
    units: post.amount ? convAmount.reverse(post.amount) : null,
    cost: convCost.reverse(post.cost),
    meta: convPostingLabelsMap.reverse({
      ...post.labelsMap,
      ...(post.price && {
        price: [
          post.price.type === 'unit' ? '@' : '@@',
          formatDecimal(post.price.amount.quantity),
          post.price.amount.unit,
        ].join(' '),
      }),
      ...R.pipe(cleanValue(post.memo), (memo) => memo && {memo}),
      // ...(post.accountId && {account_id: post.accountId}),
    }),
    // Price cannot be rounded according to normal rules if we want to avoid rounding errors
    price: R.pipe(
      post.price &&
        (post.price.type === 'unit'
          ? post.price.amount
          : A.divide(post.price.amount, Math.abs(post.amount.quantity))),
      (p): Beancount.Units | undefined =>
        p && omitTrading ? {currency: p.unit, number: p.quantity} : undefined,
    ),
    // Do not convert price to beancount, use trading account is better always plus it avoids
    // all the conversion rounding issues, esp with diff. significant decimal places
    // Plus beancount does not internaly support the `totalPrice` mechanism, only `unit` which is lossy
  }),
})

const convPostingsMap = conv<
  Beancount.Posting[],
  Pta.Transaction['postingsMap']
>({
  forward: (posts) => {
    const [main, ...rest] = posts
      .map(convPosting)
      .map((p, i) => ({...p, sortKey: p.sortKey ?? i}))
    if (rest.length === 1 && rest[0]?.amount.unit === main?.amount.unit) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return makePostingsMap({main, remainder: R.omit(rest[0]!, ['amount'])})
    }
    return makePostingsMap(
      {main},
      objectFromArray(rest, (_, i) => temp_makeId('post', `${i + 2}`)),
    )
  },
  reverse: (map) => {
    const {main, remainder, ...others} = map ?? {}
    const postings = R.compact([
      main && convPosting.reverse(main),
      ...inPlaceSort(Object.entries(others))
        .asc([([, post]) => post.sortKey, ([key]) => key])
        // We filter out the trading postings for now to generate less noise in beancount
        .filter(([, p]) => !omitTrading || p.accountType !== 'equity/trading')
        .map(([, post]) => convPosting.reverse(post)),
      // TODO: Fix me
      remainder &&
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
        convPosting.reverse(R.omit(remainder, ['amount' as any]) as any),
    ])
    // TODO: Move this functionality into its own plugin would be good
    // Sort by currency in order of appearance to make sure the generated posting order
    // is stable through beancount parser roundtrip
    const currOrder = objectFromArray(
      R.uniq(postings.map((p) => p.units?.currency ?? '')),
      (curr) => curr,
      (_, index) => index,
    )
    return inPlaceSort(postings).asc((p) => currOrder[p.units?.currency ?? ''])
  },
})

export const convTransaction = conv<
  NonEmptyArray<Beancount.Transaction>,
  Pta.Transaction
>({
  forward: ([beanTxn]) => ({
    // Rethink whether this should be ExternalId in the case of beancount as a source
    id: beanTxn.meta?.['id']
      ? // eslint-disable-next-line @typescript-eslint/no-base-to-string
        (`${beanTxn.meta['id']}` as TransactionId)
      : (temp_makeId('txn', beanTxn.hash) as TransactionId),
    date: beanTxn.date, // Parse time component?
    description: beanTxn.narration,
    payee: beanTxn.payee,
    reviewStatus: convReviewStatus(beanTxn.flag),
    labelsMap: convLabelsMap(beanTxn.tags),
    postingsMap: convPostingsMap(beanTxn.postings),
    transferId: beanTxn.links[0], // Only support 1 link for now
    // TODO: Parse attachments out of beancount meta
  }),
  reverse: (stdTxn) => {
    // Start with some data standardization..
    // HACK sometimes description and notes are the same
    // in those situations it is obviously useless to have notes...
    const notes =
      stdTxn.notes !== stdTxn.description && cleanValue(stdTxn.notes)
    const postingsMap = R.mapValues(stdTxn.postingsMap ?? {}, (posting) =>
      R.omit(
        posting,
        R.compact([
          posting.date === stdTxn.date && 'date',
          // as well as posting memo
          posting.memo === stdTxn.description && 'memo',
        ]),
      ),
    ) as typeof stdTxn.postingsMap

    const txnDate =
      stdTxn.labelsMap?.[TRANSACTION_LABELS.padding] ||
      stdTxn.labelsMap?.[TRANSACTION_LABELS.assertion]
        ? DateTime.fromISO(stdTxn.date)
            .minus({day: 1})
            [hasTime(stdTxn.date) ? 'toISO' : 'toISODate']()
        : stdTxn.date
    const dates = R.uniq([
      ...Object.values(postingsMap ?? {}).map((p) => p.date ?? txnDate),
      txnDate,
    ])

    const txn: Omit<Beancount.Transaction, 'postings'> = {
      meta: {
        ...metaFromStandard(stdTxn, {includeLabels: false}),
        ...(notes && {notes}),
      },
      // Special hack for balance padding transaction
      date: txnDate,
      flag: convReviewStatus.reverse(stdTxn.reviewStatus) ?? 'txn',
      narration: cleanValue(stdTxn.description) ?? '',
      payee: cleanValue(stdTxn.payee),
      // Equivalent to `*` flag, since it gets set by default. See
      // https://beancount.github.io/docs/beancount_language_syntax.html
      tags: convLabelsMap.reverse(stdTxn.labelsMap),
      links: R.compact([stdTxn.transferId, dates.length > 1 && stdTxn.id]),
    }
    return dates.map(
      (date): Beancount.Transaction => ({
        ...txn,
        meta: {...txn.meta, ...(hasTime(date) && {date})}, // Incorrect...
        date,
        postings: convPostingsMap.reverse(
          R.pickBy(postingsMap ?? {}, (p) => (p.date ?? txnDate) === date),
        ),
      }),
    ) as NonEmptyArray<Beancount.Transaction>
  },
})

function hasTime(isoDate: ISODate | ISODateTime) {
  return isoDate.length > '2000-00-00'.length
}

/**
 * Unfortunately not a one-to-one correspondence. As in beancount
 * prices and balances are separate directives whereas in Standard they
 * are embedded entities of accounts and commodities respectively.
 * So StandardEntity -> One or more Beancount entires
 * One beancount entry -> One standard entity...
 */
const convWrappedEntry = conv<
  Beancount.WrappedEntry[] | null,
  Pta.TypeAndEntity | null
>({
  forward: (_w) => {
    const [w, ...rest] = _w ?? []
    if (rest.length > 0) {
      throw new Error('Expecting a single ')
    }
    switch (w?.type) {
      case 'Open':
        return stdTypeAndEntity('account', {
          ...convAccountFullName(w.entry.account),
          openDate: w.entry.date,
          id: w.entry.meta?.['id']
            ? // eslint-disable-next-line @typescript-eslint/no-base-to-string
              (`${w.entry.meta['id']}` as AccountId)
            : undefined,
        })
      case 'Commodity':
        return stdTypeAndEntity('commodity', {
          unit: convCurrency(w.entry.currency),
          id: w.entry.meta?.['id']
            ? // eslint-disable-next-line @typescript-eslint/no-base-to-string
              (`${w.entry.meta['id']}` as CommodityId)
            : undefined,
        })
      case 'Price': {
        const quote = convAmount(w.entry.amount)
        return stdTypeAndEntity('commodity', {
          unit: convCurrency(w.entry.currency),
          pricesMap: {
            [makePriceKey(quote.unit, w.entry.date)]: {
              quote,
            },
          },
          // TODO: add support for `id` for prices
        })
      }
      case 'Transaction':
        return stdTypeAndEntity(
          'transaction',
          convTransaction([{...w.entry, hash: w.hash}]),
        )
      case 'Balance':
      // TODO: Support balance and padding directives
    }
    return null
  },
  reverse: (item): Beancount.WrappedEntry[] | null => {
    switch (item?.[0]) {
      case 'account': {
        const acct = item[1]
        const account = convAccountFullName.reverse(acct)
        return [
          {
            type: 'Open',
            entry: {
              account: convAccountFullName.reverse(acct),
              date: acct.openDate ?? '1970-01-01',
              booking: undefined,
              meta: {
                ...metaFromStandard(acct),
                name: acct.name, // Maybe some others too?
              },
            },
          },
          ...Object.entries(item[1].balancesMap ?? {}).flatMap(
            ([key, balance]) => {
              if (balance?.disabled) {
                return []
              }
              const date = DateTime.fromISO(balance?.date ?? key)
              // Beancount works with beginning of date only, so padding needs to be
              // day before
              const balDate = date.toISODate()
              const paddingDate = date.minus({day: 1}).toISODate()
              // Further beancount can only support partial balance assertion
              // so the semantics are not identical. However this is a limitation
              // we will have to live with

              return (balance?.holdings ?? []).flatMap(
                (holding): Beancount.WrappedEntry[] =>
                  R.compact([
                    math.isNonZero(
                      balance?.custom?.paddingAmount?.[holding.unit] ?? 0,
                    ) && {
                      type: 'Pad',
                      entry: {
                        account,
                        date: paddingDate,
                        // TODO: Add padding account to Standard Balance...
                        source_account: 'Expenses:Balance-Padding',
                      },
                    },
                    {
                      type: 'Balance',
                      entry: {
                        account,
                        date: balDate,
                        amount: {
                          number: holding.quantity,
                          currency: holding.unit,
                        },
                        // No need for separate meta.key if it is identical to the date
                        meta: {
                          ...(balance && metaFromStandard(balance)),
                          // Add time component to help with sorting...
                          ...(balance?.date &&
                            hasTime(balance.date) && {date: balance.date}),
                          ...R.pipe(
                            cleanValue(balance?.description),
                            (d) => d && {description: d},
                          ),
                        },
                      },
                    },
                  ]),
              )
            },
          ),
        ]
      }
      case 'transaction':
        return convTransaction
          .reverse(item[1])
          .map((entry) => ({type: 'Transaction', entry}))
      case 'commodity': {
        const comm = item[1]
        return [
          {
            type: 'Commodity',
            entry: {
              currency: convCurrency.reverse(comm.unit),
              date: '1970-01-01',
              meta: metaFromStandard(comm),
            },
          },
          ...R.pipe(
            comm.pricesMap ?? {},
            R.toPairs,
            R.map(
              ([key, price]): Beancount.WrappedEntry => ({
                type: 'Price',
                entry: {
                  currency: price.baseUnit ?? comm.unit,
                  date: price.date ?? key, // Key is currently used as date
                  amount: {
                    // Not using convAmount because we do not want rounding.
                    currency: price.quote.unit,
                    number: price.quote.quantity,
                  },
                  // Dedupe with logic for balance..
                  meta: {
                    ...metaFromStandard(price),
                    ...(price.date &&
                      hasTime(price.date) && {date: price.date}),
                    ...R.pipe(
                      cleanValue(price.description),
                      (d) => d && {description: d},
                    ),
                  },
                },
              }),
            ),
          ),
        ]
      }
    }
    return null
  },
})

export const convBeanJsonToStdJson = conv<Beancount.JSONExport, Pta.JSONExport>(
  {
    forward: (input) => {
      const nErrs = input.errors.length
      if (process.env.NODE_ENV !== 'production' && nErrs > 0) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const err = input.errors[0]!
        throw new Error(
          `${nErrs > 1 ? `[1 of ${nErrs}]` : ''}${err.message} at ${
            err.source.filename
          } line ${err.source.lineno}`,
        )
      }

      const entityById: Record<string, Pta.TypeAndEntity> = {}
      for (const entry of input.entries) {
        const entity = convWrappedEntry([entry])
        if (entity) {
          switch (entity[0]) {
            case 'account':
              entityById[entity[1].name] = entity
              break
            case 'transaction':
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              entityById[entity[1].id!] = entity
              break
            case 'commodity': {
              const existing = entityById[entity[1].unit]?.[1] as
                | Pta.Commodity
                | undefined
              entityById[entity[1].unit] = [
                'commodity',
                {
                  ...existing,
                  ...entity[1],
                  pricesMap: {
                    ...existing?.pricesMap,
                    ...entity[1].pricesMap,
                  },
                },
              ]
              break
            }
          }
        }
      }
      return {
        variant: 'standard',
        version: '1',
        entities: Object.values(entityById),
      }
    },
    reverse: (input) => ({
      variant: 'beancount',
      version: '1',
      entries: sortBeanEntries(
        input.entities
          .flatMap(convWrappedEntry.reverse)
          .filter((r): r is NonNullable<typeof r> => !!r),
      ),
      errors: [],
      options: {
        operating_currency: input.ledger?.defaultUnit
          ? [input.ledger.defaultUnit]
          : undefined,
      },
    }),
  },
)

/**
 * Be ware that this is not 100% bidirectional lossless
 * In particular beancount parser seems to sort the postings based on Commodity
 * @see https://share.cleanshot.com/l0CZFf
 * TODO: Surface error during beanToJson
 */
export const convBeanFile = asyncConv<string, Beancount.JSONExport>(() => {
  const beanJsonCmd = getEnvVar('BEAN_JSON_CMD')
  const execCommand = resolveFnIfRegistered($execCommand)

  const converterUrl = getEnvVar('BEANCOUNT_CONVERTER_URL')

  const axios = createHTTPClient({
    baseURL:
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      converterUrl ||
      'https://us-central1-plain-text-accounting.cloudfunctions.net/converter',
  })

  // https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/
  function parseBeanJson(json: unknown): Beancount.JSONExport {
    try {
      const ret =
        typeof json === 'string'
          ? (JSON.parse(json) as Beancount.JSONExport)
          : (json as Beancount.JSONExport)
      if (ret && ret.variant !== 'beancount') {
        throw new Error(`Expected variant beancount, got ${ret.variant}`)
      }
      if (ret.errors.length > 0) {
        console.warn('Error parsing bean string', ret.errors)
      }
      return ret
    } catch (err) {
      console.error(err)
    }
    throw new Error(`Unable to convert with beancount: ${json}`)
  }

  return {
    forward: (beanStr) =>
      beanJsonCmd && execCommand
        ? execCommand(`${beanJsonCmd} bean_to_json`, beanStr).then((r) =>
            parseBeanJson(r.stdout),
          )
        : axios
            .post('/bean_to_json', beanStr)
            .then((r) => parseBeanJson(r.data)),
    reverse: async (beanJson) => {
      const beanStr = await (beanJsonCmd && execCommand
        ? execCommand(
            `${beanJsonCmd} json_to_bean`,
            JSON.stringify(beanJson),
          ).then((r) => r.stdout)
        : axios.post<string>('/json_to_bean', beanJson).then((r) => r.data))
      const curr = beanJson.options.operating_currency?.[0]
      return R.compact([
        // This is really not ideal. we should refactor the converter to
        // be one that can take some options... or at least clean this up
        curr && defaultOptions(curr),
        beanStr,
      ]).join('\n')
    },
  }
})

export const convBeanToStdJson = asyncConv<
  string,
  Pta.JSONExport,
  Beancount.JSONExport
>({
  forward: (content) =>
    typeof content === 'string'
      ? convBeanFile(content).then(convBeanJsonToStdJson)
      : Promise.resolve(convBeanJsonToStdJson(content)),
  reverse: (json) => convBeanFile.reverse(convBeanJsonToStdJson.reverse(json)),
})

// MARK: - Utils

export function defaultOptions(curr = 'USD') {
  return `
option "operating_currency" "${curr}"
option "inferred_tolerance_default" "IDR:100"
option "inferred_tolerance_default" "MXN:0.1" ; 50 cents
option "inferred_tolerance_default" "*:0.01"
option "render_commas" "TRUE"
`
}

/** Used to produce stable sort order to minimize git diffs */
export const sortBeanEntries = (entries: Beancount.WrappedEntry[]) =>
  inPlaceSort(entries).by([
    // Date here could potentially contain time too. not Ideal...
    // Let's code defensively.
    {asc: (e) => e.entry.date.slice(0, '2020-01-01'.length)},
    {asc: (e) => e.type}, // Beancount sorts by type when parsing, so let's aim for roundtrip fidelity
    {asc: (e) => e.entry.meta?.['date'] ?? ''}, // Missing time sorted first
    {asc: (e) => e.entry.meta?.['id']}, // Missing id sorted last...
  ])
