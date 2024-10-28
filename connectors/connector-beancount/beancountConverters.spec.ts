import {ACCOUNT_TYPES, makePostingsMap, type Pta} from '@openint/cdk'
// Not sure why this is needed for ci but not locally, but cannot be bothered to find out for now
import {A} from '@openint/util'
import {
  cleanBeancountAccountName,
  convAccountFullName,
  convBeanToStdJson,
} from './beancountConverters'

const stringSnapshotSerializer: jest.SnapshotSerializerPlugin = {
  serialize(val) {
    return val as string
  },
  test(val) {
    return typeof val === 'string'
  },
}

expect.addSnapshotSerializer(stringSnapshotSerializer)

test.each([
  [
    'General & Administrative/Business Insurance_Policy',
    'General-Administrative:Business-Insurance-Policy',
  ],
  ['Chase CC (2289)', 'Chase-CC-2289'],
])('cleanBeancountAccountName(%o) -> %o', (input, output) => {
  expect(cleanBeancountAccountName(input)).toEqual(output)
})

test.each([['Assets:Wallet', {type: ACCOUNT_TYPES.asset, name: 'Wallet'}]])(
  'convAccountFullName(%o) -> %o',
  (input, output) => {
    expect(convAccountFullName(input)).toMatchObject(output)
  },
)

// Disable because the json conversion api is down
// eslint-disable-next-line jest/no-disabled-tests
test.skip('degenerate case: no transactions', async () => {
  await expect(
    convBeanToStdJson
      .reverse({version: '1', variant: 'standard', entities: []})
      .then((s) => s.trim()),
  ).resolves.toMatchSnapshot()
}, 60000)

// Disable because the json conversion api is down
// eslint-disable-next-line jest/no-disabled-tests
test.skip('ledger with default unit', async () => {
  await expect(
    convBeanToStdJson
      .reverse({
        version: '1',
        ledger: {defaultUnit: 'IDR' as Unit},
        variant: 'standard',
        entities: [],
      })
      .then((s) => s.trim()),
  ).resolves.toMatchSnapshot()
}, 60000)

// Disable because the json conversion api is down
// eslint-disable-next-line jest/no-disabled-tests
test.skip.each<Pta.Transaction>([
  {
    date: '2020-01-01',
    description: 'Latte',
    postingsMap: makePostingsMap({
      main: {accountName: 'Cash', amount: A(10, 'USD')},
      remainder: {accountName: 'Drinks'},
    }),
  },
  {
    date: '2020-01-01',
    description: 'Pad balance',
    postingsMap: makePostingsMap({
      main: {accountName: 'Cash', amount: A(10, 'USD')},
      remainder: {accountName: 'Drinks'},
    }),
  },
])(
  'convTransaction.reverse(%o)',
  async (stdTxn) => {
    await expect(
      convBeanToStdJson
        .reverse({
          version: '1',
          variant: 'standard',
          entities: [['transaction', stdTxn]],
        })
        .then((s) => s.trim()),
    ).resolves.toMatchSnapshot()
  },
  60000,
)
