import type {ConnectorDef, ConnectorSchemas, Pta} from '@openint/cdk'
import {connHelpers, makePostingsMap} from '@openint/cdk'
import {
  A,
  DateTime,
  formatAmount,
  math,
  objectFromArray,
  parseMoney,
  z,
} from '@openint/util'
import type {zUser} from './splitwise-schema'
import {zCurrentUser, zExpense, zGroup} from './splitwise-schema'

export const splitwiseSchemas = {
  name: z.literal('splitwise'),
  resourceSettings: z.object({
    currentUser: zCurrentUser.nullish(),
    accessToken: z.string(),
  }),

  sourceOutputEntity: z.discriminatedUnion('entityName', [
    z.object({
      id: z.string(),
      entityName: z.literal('account'),
      entity: zGroup,
    }),
    z.object({
      id: z.string(),
      entityName: z.literal('transaction'),
      entity: zExpense.extend({group_name: z.string()}),
    }),
  ]),
} satisfies ConnectorSchemas

export const splitwiseHelpers = connHelpers(splitwiseSchemas)

export const splitwiseDef = {
  name: 'splitwise',
  schemas: splitwiseSchemas,
  metadata: {verticals: ['personal-finance'],
    logoUrl: '/_assets/logo-splitwise.svg',
  },
  standardMappers: {
    entity: {
      account: ({entity: a}) => ({
        id: `${a.id}`,
        entityName: 'account',
        entity: {
          name: `Groups/${a.name}`,
          // balance: getSplitwiseAccountBalance(a, 'current'), // how to get this?
          // No longer true
          type: 'asset',
        },
      }),
      transaction: ({entity: t}) => {
        const cost = A(parseMoney(t.cost), t.currency_code)
        const partialTxn: Pick<
          Pta.Transaction,
          'date' | 'removed' | 'notes' | 'payee'
        > = {
          notes: t.details,
          date: DateTime.fromISO(t.date).toISODate(),
          removed: t.deleted_at != null,
          payee: t.group_name,
        }

        if (t.payment) {
          const from = t.users.find((u) => u.user.id === t.repayments[0]?.from)
            ?.user
          const to = t.users.find((u) => u.user.id === t.repayments[0]?.to)
            ?.user
          return {
            id: `${t.id}`,
            entityName: 'transaction',
            entity: {
              ...partialTxn,
              description: `${formatUser(from)} paid ${formatUser(
                to,
              )} ${formatAmount(cost)}`,
              postingsMap: makePostingsMap(
                {},
                {
                  from: {
                    accountType: 'equity/clearing',
                    // TODO: Figure out whether we should be using account name here
                    // at all...
                    accountName: `${formatUser(from)}/Transfers`,
                    amount: A.invert(cost),
                  },
                  to: {
                    accountType: 'equity/clearing',
                    accountName: `${formatUser(to)}/Transfers`,
                    amount: cost,
                  },
                },
              ),
            },
          }
        }

        const contribs = t.users
          .filter((u) => math.isNonZero(parseMoney(u.paid_share)))
          .map((u) => ({
            user: u.user,
            posting: {
              accountType:
                parseMoney(u.paid_share) < 0
                  ? ('expense' as const)
                  : ('income' as const),
              accountName: `Uncategorized-${
                parseMoney(u.paid_share) < 0 ? 'Expense' : 'Income'
              }`,
              // accountName: `${formatUser(u.user)}/Contributions`,
              amount: A(-1 * parseMoney(u.paid_share), cost.unit),
            },
            remainder: {
              accountName: t.group_name,
              accountType: 'liability',
              amount: A(parseMoney(u.paid_share), cost.unit),
            },
          }))
        return {
          id: `${t.id}`,
          entityName: 'transaction',
          entity: {
            ...partialTxn,
            description: t.description,
            externalCategory: t.category.name,
            postingsMap: makePostingsMap(
              {
                main: contribs.length === 1 ? contribs[0]?.posting : undefined,
              },
              contribs.length > 1
                ? objectFromArray(
                    contribs,
                    (c) => `contrib_${c.user.id}`,
                    (c) => c.posting,
                  )
                : {
                    // This is  for "Liabilities" in beancount, cannot set it as remainder because we Omit "amount"
                    liabilities:
                      contribs.length === 1
                        ? (contribs[0]?.remainder as Pta.Posting)
                        : undefined,
                  },
            ),
          },
        }
      },
    },
  },
} satisfies ConnectorDef<typeof splitwiseSchemas>

// Helpers
export function formatUser(user?: z.infer<typeof zUser>) {
  return user
    ? `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()
    : 'Unnamed user'
}

export default splitwiseDef
