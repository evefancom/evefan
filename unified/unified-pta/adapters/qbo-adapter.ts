import {DateTime} from 'luxon'
import {type QBOSDK, type QBOSDKTypes} from '@openint/connector-qbo'
import {mapper, z, zCast} from '@openint/vdk'
import type * as Pta from '../pta-types'
import {makePostingsMap} from '../pta-utils'
import type {PtaAdapter} from '../router'
import * as unified from '../unifiedModels'

/** Prefix id with realmId to get id global within QBO provider */
function globalId(realmId: string, entityId: string) {
  return `${realmId}_${entityId}` as ExternalId
}

type QBO = QBOSDKTypes['oas']['components']['schemas']

export type TransactionTypeName = Extract<
  QBO['EntityName'],
  'Purchase' | 'Deposit' | 'JournalEntry' | 'Invoice' | 'Payment'
>

type EnumOf<E extends string | number | symbol> = {[K in E]: K}
const A = (quantity: number, unit: string) => ({
  quantity,
  unit: unit as Unit,
})

export const TRANSACTION_TYPE_NAME: EnumOf<TransactionTypeName> = {
  Purchase: 'Purchase',
  Deposit: 'Deposit',
  JournalEntry: 'JournalEntry',
  Invoice: 'Invoice',
  Payment: 'Payment',
}

const QBO_CLASSFICATION_TO_ACCOUNT_TYPE: Record<
  QBO['Account']['Classification'],
  Pta.AccountType
> = {
  Asset: 'asset',
  Equity: 'equity',
  Liability: 'liability',
  Revenue: 'income',
  Expense: 'expense',
}

function mapQboAccountType(a: QBO['Account']) {
  // TODO: Take into account a.AccountType and a.AccountSubtype
  return QBO_CLASSFICATION_TO_ACCOUNT_TYPE[a.Classification]
}

const mappers = {
  account: mapper(zCast<QBO['Account']>(), unified.account, (a) => ({
    name: a.FullyQualifiedName.replaceAll(':', '/'),
    // QBO account balance should always be computed because we are guaranteed
    // the full data set and no need for balance syncing
    type: mapQboAccountType(a),
    removed: a.status === 'deleted',
    defaultUnit: (a.CurrencyRef.value ?? undefined) as Unit | undefined,
    informationalBalances: {
      current: A(a.CurrentBalance, a.CurrencyRef.value),
    },
  })),

  transaction: mapper(
    z.discriminatedUnion('type', [
      z
        .object({type: z.literal('Deposit'), entity: zCast<QBO['Deposit']>()})
        .extend({realmId: z.string()}),
      z
        .object({
          type: z.literal('Purchase'),
          entity: zCast<QBO['Purchase']>(),
        })
        .extend({realmId: z.string()}),
      z
        .object({
          type: z.literal('JournalEntry'),
          entity: zCast<QBO['JournalEntry']>(),
        })
        .extend({realmId: z.string()}),
      z
        .object({type: z.literal('Invoice'), entity: zCast<QBO['Invoice']>()})
        .extend({realmId: z.string()}),
      z
        .object({type: z.literal('Payment'), entity: zCast<QBO['Payment']>()})
        .extend({realmId: z.string()}),
    ]),
    unified.transaction,
    (t) => {
      switch (t.type) {
        case 'Purchase': {
          const sign = t.entity.Credit ? 1 : -1
          const postings: Pta.PostingsMap = {
            main: {
              accountExternalId: globalId(t.realmId, t.entity.AccountRef.value),
              amount: A(sign * t.entity.TotalAmt, t.entity.CurrencyRef.value),
            },
          }
          for (const l of t.entity.Line) {
            postings[l.Id] = {
              // TODO: Handle non-accountBasedExpenseLineDetail
              accountExternalId:
                l.AccountBasedExpenseLineDetail &&
                globalId(
                  t.realmId,
                  l.AccountBasedExpenseLineDetail.AccountRef.value,
                ),
              amount: A(-1 * sign * l.Amount, t.entity.CurrencyRef.value),
              memo: l.Description,
            }
          }
          return {
            date: DateTime.fromISO(t.entity.TxnDate, {
              zone: 'UTC',
            }).toISODate(),
            pending: false, // fix me?
            postingsMap: postings,
            payee:
              // TODO: Figure out if '-- Vendor name pending --' is a Pilot specific thing
              t.entity.EntityRef?.name !== '-- Vendor name pending --'
                ? t.entity.EntityRef?.name
                : undefined,
            description:
              Object.values(postings).find((post) => post.memo)?.memo ??
              t.entity.PrivateNote ??
              '',
            notes: t.entity.PrivateNote,
            removed: t.entity.status === 'deleted',
          }
        }
        case 'Deposit': {
          const postings: Pta.PostingsMap = {
            main: {
              accountExternalId: globalId(
                t.realmId,
                t.entity.DepositToAccountRef.value,
              ),
              amount: A(t.entity.TotalAmt, t.entity.CurrencyRef.value),
            },
          }
          for (const l of t.entity.Line) {
            postings[l.Id] = {
              // Handle https://gist.github.com/tonyxiao/a9873b41c2df76f4f66c226933134a82
              accountExternalId:
                l.DepositLineDetail?.AccountRef &&
                globalId(t.realmId, l.DepositLineDetail.AccountRef.value),
              amount: A(-1 * l.Amount, t.entity.CurrencyRef.value),
              memo: l.Description,
            }
          }
          return {
            date: DateTime.fromISO(t.entity.TxnDate, {
              zone: 'UTC',
            }).toISODate(),
            pending: false, // fix me?
            postingsMap: postings,
            description:
              Object.values(postings).find((post) => post.memo)?.memo ??
              t.entity.PrivateNote ??
              '',
            notes: t.entity.PrivateNote,
            removed: t.entity.status === 'deleted',
          }
        }
        case 'JournalEntry': {
          const postings: Pta.PostingsMap = {}
          const filteredLines = t.entity.Line.filter(
            // https://c9.qbo.intuit.com/app/journal?txnId=842 For instance
            // has a line that looks like { "Id": "0", "DetailType": "DescriptionOnly" }
            (l) => l.DetailType !== 'DescriptionOnly',
          )
          for (const l of filteredLines) {
            postings[l.Id] = {
              accountExternalId: globalId(
                t.realmId,
                l.JournalEntryLineDetail.AccountRef.value,
              ),
              amount: A(
                (l.JournalEntryLineDetail.PostingType === 'Credit' ? -1 : 1) *
                  l.Amount,
                t.entity.CurrencyRef.value,
              ),
              memo: l.Description ?? '',
            }
          }

          return {
            date: DateTime.fromISO(t.entity.TxnDate, {
              zone: 'UTC',
            }).toISODate(),
            pending: false, // fix me?
            postingsMap: postings,
            description:
              (t.entity.DocNumber
                ? `Journal Entry #${t.entity.DocNumber}`
                : null) ??
              Object.values(postings).find((post) => post.memo)?.memo ??
              t.entity.PrivateNote ??
              '',
            notes: t.entity.PrivateNote,
            removed: t.entity.status === 'deleted',
          }
        }
        case 'Invoice': {
          const postings: Pta.PostingsMap = {
            main: {
              amount: A(t.entity.TotalAmt, t.entity.CurrencyRef.value),
              // https://quickbooks.intuit.com/learn-support/en-us/install/does-qbo-support-multiple-a-r-accounts-or-is-there-a-workaround/00/193034
              // QBO uses a default accounts receivable account. but it does not appear possible to know
              // exactly the id of the default account. therefore we wiill have to make do...
              // https://c9.qbo.intuit.com/app/invoice?txnId=3968 for instance
              accountType: 'asset/accounts_receivable',
              accountName: 'Accounts Receivable',
            },
          }
          for (const l of t.entity.Line) {
            const postId = l.Id ?? l.DetailType
            const memo = l.Description ?? ''
            if (l.SalesItemLineDetail) {
              postings[postId] = {
                memo,
                // Income is negative
                amount: A(-1 * l.Amount, t.entity.CurrencyRef.value),
                accountType: 'income',
                accountName: 'Revenue',
              }
            } else if (l.DiscountLineDetail) {
              postings[postId] = {
                memo,
                // Discount is positive
                amount: A(l.Amount, t.entity.CurrencyRef.value),
                accountExternalId: globalId(
                  t.realmId,
                  l.DiscountLineDetail.DiscountAccountRef.value,
                ),
              }
            }
          }

          return {
            date: DateTime.fromISO(t.entity.TxnDate, {
              zone: 'UTC',
            }).toISODate(),
            pending: false, // fix me?
            postingsMap: postings,
            description:
              Object.values(postings).find((post) => post.memo)?.memo ??
              t.entity.PrivateNote ??
              '',
            notes: t.entity.PrivateNote,
            removed: t.entity.status === 'deleted',
          }
        }
        // TODO: Generate postings map rather than entire transaction to reduce duplication
        case 'Payment': {
          // https://c9.qbo.intuit.com/app/recvpayment?txnId=3992 for instance
          const postings = makePostingsMap({
            main: {
              amount: A(t.entity.TotalAmt, t.entity.CurrencyRef.value),
              // https://quickbooks.intuit.com/learn-support/en-us/install/does-qbo-support-multiple-a-r-accounts-or-is-there-a-workaround/00/193034
              // QBO uses a default accounts receivable account. but it does not appear possible to know
              // exactly the id of the default account. therefore we wiill have to make do...
              // https://c9.qbo.intuit.com/app/invoice?txnId=3968 for instance
              accountExternalId:
                t.entity.DepositToAccountRef &&
                globalId(t.realmId, t.entity.DepositToAccountRef.value),
            },
            remainder: {
              accountType: 'asset/accounts_receivable',
              accountName: 'Accounts Receivable',
            },
          })
          return {
            date: DateTime.fromISO(t.entity.TxnDate, {
              zone: 'UTC',
            }).toISODate(),
            pending: false, // fix me?
            postingsMap: postings,
            description:
              Object.values(postings).find((post) => post.memo)?.memo ??
              t.entity.PrivateNote ??
              '',
            notes: t.entity.PrivateNote,
            removed: t.entity.status === 'deleted',
          }
        }
        default:
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
          throw new Error(`[qbo] Unhandled txn type: ${(t as any).type}`)
      }
    },
  ),
}

export const qboAdapter = {
  listAccounts: async ({instance}) => {
    const res = await instance.getAll('Account').next()
    return {
      has_next_page: true,
      items: res.value?.entities?.map(mappers.account) ?? [],
    }
  },
  listTransactions: async ({instance: qbo}) => {
    async function* iterateEntities() {
      const updatedSince = undefined
      for (const type of Object.values(TRANSACTION_TYPE_NAME)) {
        for await (const res of qbo.getAll(type, {updatedSince})) {
          const entities = res.entities as Array<QBO[TransactionTypeName]>
          yield entities.map((t) => ({
            Id: t.Id, // For primary key...
            type: type as 'Purchase',
            entity: t as QBO['Purchase'],
            realmId: qbo.realmId,
          }))
        }
      }
    }
    const res = await iterateEntities().next()
    return {
      has_next_page: true,
      items: res.value?.map(mappers.transaction) ?? [],
    }
  },
  listCommodities: async () => {
    throw new Error('Not implemented')
  },
} satisfies PtaAdapter<QBOSDK>
