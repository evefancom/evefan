import {R, titleCase, z} from '@openint/util'
import type {
  CommandDefinitionInput,
  CommandDefinitionMap,
  CommandDraft,
} from './command-types'

export type PreparedCommand = ReturnType<
  typeof prepareCommands
>['commands'][number]

export function prepareCommand([key, value]: [
  key: string,
  def: CommandDefinitionInput<any>,
]) {
  const [_group, titleInGroup] = (key.split('/').pop() ?? '').split(':')
  const title = titleInGroup ? [titleInGroup, _group].join(' ') : _group
  const group = titleInGroup ? _group : ''
  const params = value.params ?? z.object({})
  return {
    ...value,
    params,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    hasParams: Object.keys(params.shape).length > 0,
    title: value.title ?? titleCase(title),
    group: titleCase(value.group ?? group),
    key,
  }
}

// TODO: Detect shortcut conflict
export function prepareCommands({
  definitions,
}: {
  definitions: CommandDefinitionMap<any>
}) {
  const commands = Object.entries(definitions).map(prepareCommand)
  const commandGroups = R.groupBy(commands, (c) => c.group)

  return {commandGroups, commands}
}

export function filterCommands({
  commands: allCommands,
  params,
}: {
  commands: PreparedCommand[]
  params: Record<string, unknown>
}) {
  const hasParams = Object.keys(params).length > 0

  const commands = allCommands.filter((cmd) => {
    // Temp solution for globalCommands
    if (!hasParams && cmd.hasParams) {
      return false
    }
    // Check if every command is valid
    for (const [key, value] of Object.entries(params)) {
      const shape = cmd.params.shape as Record<string, z.ZodTypeAny>
      const paramSchema = shape[key]
      if (!paramSchema) {
        return false
      }
      if (!paramSchema.safeParse(value).success) {
        return false
      }
    }
    return true
  })

  const commandGroups = R.groupBy(commands, (c) => c.group)
  return {commands, commandGroups}
}

/** WARNING: Only works with commands that do not have react hooks... */
export function executeCommand<
  TDef extends CommandDefinitionMap<TCtx>,
  TKey extends keyof TDef,
  TCtx = unknown,
>({
  definitions,
  command: [key, params],
  ctx,
}: {
  definitions: TDef
  command: CommandDraft<TDef, TKey, TCtx>
  ctx: TCtx
}) {
  return definitions[key]?.execute?.({params, ctx}) as ReturnType<
    NonNullable<TDef[TKey]['execute']>
  >
}
