import {zId} from '@openint/cdk'
import {z} from '@openint/util'
import {executeCommand, filterCommands, prepareCommands} from './command-fns'
import type {CommandDefinitionMap} from './command-types'

const definitions = {
  sync: {
    execute: () => 'synced',
  },
  'pipeline:delete': {
    icon: 'Trash',
    params: z.object({
      pipeline: zId('pipe'),
    }),
    execute: () => true,
  },
} satisfies CommandDefinitionMap

const {commands} = prepareCommands({definitions})

test('filter commands', () => {
  const filtered = filterCommands({commands, params: {pipeline: 'pipe_1234'}})
  expect(filtered.commands).toHaveLength(1)
  expect(filtered.commands[0]?.key).toBe('pipeline:delete')
})

test('filter commands not matching params', () => {
  const filtered = filterCommands({commands, params: {pipeline: '123'}})
  expect(filtered.commands).toHaveLength(0)
})

test('implicit global commands', () => {
  const filtered = filterCommands({commands, params: {}})
  expect(filtered.commands.length).toEqual(1)
  expect(filtered.commands[0]?.key).toBe('sync')
})

test('executeCommand', () => {
  expect<boolean>(
    executeCommand({
      definitions,
      command: ['pipeline:delete', {pipeline: 'pipe_1234'}],
      ctx: {},
    }),
  ).toEqual(true)

  const ret = executeCommand({
    definitions,
    command: ['sync', {}],
    ctx: {},
  })
  expect<string>(ret).toEqual('synced')
})
