/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {z} from 'zod'

import {zEnvVars, zFlattenForEnv} from './env-utils'
import {zParser} from './zod-utils'
// import zodToJsonSchema from 'zod-to-json-schema'

const env = zEnvVars({
  MY_KEY: z.string(),
})

test('Error thrown includes name of the env var', () => {
  expect(() => zParser(env).parseUnknown({MY_KEY2: 2})).toThrow(
    'MY_KEY is required',
  )
})

const schema = z.object({
  nested: z.object({
    hello: z.string(),
    array: z.array(z.string()).optional(),
  }),
  valueByEnv: z.record(z.enum(['dev', 'prod']), z.string()).optional(),
})

test('z.record means optional vlaues', () => {
  expect(
    schema.parse({nested: {hello: 'world'}, valueByEnv: {dev: 'secret'}}),
  ).toBeTruthy()
})

test('flatten schema', () => {
  // console.log('before', JSON.stringify(zodToJsonSchema(schema), null, 2))
  const flat = zFlattenForEnv(schema, {stringify: false})
  // console.log('after', JSON.stringify(zodToJsonSchema(flat), null, 2))

  expect(flat.innerType().shape).toMatchObject({
    'nested.hello': expect.anything(),
    'valueByEnv.dev': expect.anything(),
    'valueByEnv.prod': expect.anything(),
  })

  expect(
    flat.parse({
      'nested.hello': 'world',
      'nested.array': ['one'],
      'valueByEnv.dev': 'secret',
    }),
  ).toMatchObject({
    nested: {hello: 'world'},
    valueByEnv: {dev: 'secret'},
  })
  expect(() => flat.parse({})).toThrow('Required')
})

test('flatten schema with array as string', () => {
  // console.log('before', JSON.stringify(zodToJsonSchema(schema), null, 2))
  const flat = zFlattenForEnv(schema, {stringify: true})
  // console.log('after', JSON.stringify(zodToJsonSchema(flat), null, 2))

  expect(flat.innerType().shape).toMatchObject({
    'nested.hello': expect.anything(),
    'valueByEnv.dev': expect.anything(),
    'valueByEnv.prod': expect.anything(),
  })

  expect(
    flat.parse({
      'nested.hello': 'world',
      'nested.array': '["one"]',
      'valueByEnv.dev': 'secret',
    }),
  ).toMatchObject({
    nested: {hello: 'world'},
    valueByEnv: {dev: 'secret'},
  })
  expect(() => flat.parse({})).toThrow('Required')
})
