import {
  deepMerge,
  deepOmitUndefined,
  deepPartialDeepEqual,
  shallowEqual,
} from './object-utils'

const simpleTestObject = {
  testString: 'string',
  undefinedKey: undefined,
}

const recursiveTestObject = {
  testString: 'string',
  undefinedKey: undefined,
  undefinedObject: {
    testString: 'string',
    undefinedKey: undefined,
    undefinedObject: {testString: 'string', undefinedKey: undefined},
  },
  undefinedNestedArray: [['1', undefined]],
  undefinedArray: [
    'string',
    undefined,
    3,
    {
      testString: 'string',
      undefinedKey: undefined,
      undefinedArray: [undefined, 3, 4],
    },
  ],
}

test('deepMerge() does not alter original objects', () => {
  const a = {a: 1}
  const b = {b: 2}
  const c = deepMerge(a, b)
  expect(c).toEqual({a: 1, b: 2})
  expect(a).toEqual({a: 1})
  expect(b).toEqual({b: 2})
})

test('deepMerge() defaults null / undefined to emtpy object', () => {
  expect(deepMerge({}, undefined)).toEqual({})
  expect(deepMerge(undefined, {})).toEqual({})
  expect(deepMerge(undefined, {}, null)).toEqual({})
  expect(deepMerge(undefined)).toEqual({})
  expect(deepMerge()).toEqual(undefined)
  expect(deepMerge(undefined, {}, '5')).toEqual('5')
})

test('deepMerge() does not merge arrays', () => {
  const a = {a: 1, key: {inner: 1}}
  const b = {b: 2, key: ['array_ele']}
  const c = deepMerge(a, b)
  expect(c).toEqual({a: 1, b: 2, key: ['array_ele']})

  expect(deepMerge({a: 1}, [2])).toEqual([2])
})

test('deepOmitUndefined() filters special keys', () => {
  expect(
    deepOmitUndefined(
      {
        password: '1234',
        manual: {
          soemthing: undefined,
        },
      },
      {
        pruneEmptyObjectProperties: true,
        redact: (k) => k !== 'password',
      },
    ),
  ).toStrictEqual({})
})

test('deepOmitUndefined() removes empty object', () => {
  expect(
    deepOmitUndefined(
      {
        key: 'value',
        manual: {
          postingsMap: {
            main: {soemthing: undefined},
          },
        },
      },
      {pruneEmptyObjectProperties: true},
    ),
  ).toStrictEqual({key: 'value'})
})

test('deepOmitUndefined() on a single level object', () => {
  expect(deepOmitUndefined(simpleTestObject)).toStrictEqual({
    testString: 'string',
  })
})

test('deepOmitUndefined() on a multi depth object with arrays', () => {
  expect(deepOmitUndefined(recursiveTestObject)).toStrictEqual({
    testString: 'string',
    undefinedObject: {
      testString: 'string',
      undefinedObject: {testString: 'string'},
    },
    undefinedNestedArray: [['1', null]],
    undefinedArray: [
      'string',
      null,
      3,
      {
        testString: 'string',
        undefinedArray: [null, 3, 4],
      },
    ],
  })
})

test('deepOmitUndefined() on a multi depth object with arrays (pruneUndefinedArrayElements:true)', () => {
  expect(
    deepOmitUndefined(recursiveTestObject, {pruneUndefinedArrayElements: true}),
  ).toStrictEqual({
    testString: 'string',
    undefinedObject: {
      testString: 'string',
      undefinedObject: {testString: 'string'},
    },
    undefinedNestedArray: [['1']],
    undefinedArray: [
      'string',
      3,
      {
        testString: 'string',
        undefinedArray: [3, 4],
      },
    ],
  })
})

test('deepOmitUndefined() array should replace undefined with null (pruneUndefinedArrayElements:false)', () => {
  expect(
    deepOmitUndefined(['1', undefined], {pruneUndefinedArrayElements: false}),
  ).toStrictEqual(['1', null])
})

test.each<
  [
    Record<string, unknown> | unknown[],
    Record<string, unknown> | unknown[],
    (
      | boolean
      | 'equal-but-not-matching'
      | 'equal-with-null-as-undefined-but-not-matching'
    ),
  ]
>([
  [{}, {}, true],
  [{}, {b: undefined}, 'equal-but-not-matching'],
  [{}, {b: null}, false],
  [{}, {b: null}, 'equal-with-null-as-undefined-but-not-matching'],
  [{}, {b: 1}, false],
  [{b: 1}, {}, true],
  [{a: 1}, {b: 1}, false],
  [{a: {b: {}}}, {}, true],
  [{a: {b: 23}}, {a: {}}, true],
  [{a: {b: undefined}}, {a: {}}, true],
  [{a: {}}, {a: {b: undefined}}, 'equal-but-not-matching'],
  [{a: {b: 23}}, {a: {c: {}}}, false],
  [{a: [1, 2]}, {a: []}, false],
  [{a: {b: [1, 2], c: 3}}, {a: {b: [1, 2]}}, true],
  [[{a: {b: [1, 2], c: 3}}], [{a: {b: [1, 2]}}], true],

  // From charts
  [
    [
      {
        unit: 'layer_1',
        fields: [{field: 'name', channel: 'y', type: 'E'}],
        values: ['Services'],
      },
    ],
    [{fields: [{field: 'name', type: 'E'}], values: ['Services']}],
    true,
  ],

  // from tabs
  [
    {
      memberKeyByHandle: {
        '+16505551234': 'vendor',
        ldgr_1234: 'customer',
      },
      type: 'vendor-customer',
      memberByKey: {
        vendor: {profile: {name: 'Test', phone: '+16505551234'}, balance: []},
        customer: {
          profile: {
            phone: '+1',
            username: 'tony',
            name: 'Tony',
          },
          balance: [],
        },
      },
    },
    {
      memberByKey: {
        vendor: {balance: []},
        customer: {balance: [], profile: undefined},
      },
    },
    'equal-but-not-matching',
  ],
  [
    {
      memberKeyByHandle: {
        '+16505551234': 'vendor',
        ldgr_1234: 'customer',
      },
      type: 'vendor-customer',
      memberByKey: {
        customer: {
          balance: [],
          profile: {
            name: 'Tony',
            phone: '+',
            username: 'tony',
          },
        },
        vendor: {profile: {phone: '+16505551234', name: 'Test'}, balance: []},
      },
    },
    {
      lastTransactionInfo: null,
      memberByKey: {
        customer: {
          balance: [],
          profile: {
            name: 'Tony',
            phone: '+',
            username: 'tony',
          },
        },
        vendor: {balance: []},
      },
    },
    'equal-with-null-as-undefined-but-not-matching',
  ],
])('deepPartialDeepEqual(%o, %o) -> %p', (a, b, expected) => {
  // if (expected === true) {
  //   // eslint-disable-next-line jest/no-conditional-expect
  //   expect(a).toMatchObject(b)
  // } else {
  //   // eslint-disable-next-line jest/no-conditional-expect
  //   expect(a).not.toMatchObject(b)
  // }

  expect(
    deepPartialDeepEqual(a, b, {
      nullMatchesUndefined:
        expected === 'equal-with-null-as-undefined-but-not-matching'
          ? true
          : undefined,
    }),
  ).toBe(expected !== false)
})

test.each([
  [[1, 2, 3], [1, 2, 3], true],
  [[2, 2, 3], [1, 2, 3], false],
])('shallowEqual(%o, %o) -> %p', (a: unknown, b: unknown, equals) => {
  expect(shallowEqual(a, b)).toBe(equals)
})
