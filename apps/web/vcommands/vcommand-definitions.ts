import {useTheme} from 'next-themes'
import type {CommandDefinitionInput, CommandDefinitionMap} from '@openint/ui'
import {cmdInit} from '@openint/ui'
import {delay, z} from '@openint/util'
import {__DEBUG__} from '@/../app-config/constants'
import {zClient} from '@/lib-common/schemas'
import {copyToClipboard} from '../lib-client/copyToClipboard'
import type {CommandContext} from './vcommand-context'

const cmd = cmdInit<CommandContext>()

const _pipelineCommand = {
  group: 'pipeline',
  params: z.object({pipeline: zClient.pipeline}),
} satisfies CommandDefinitionInput<CommandContext>

export const pipelineCommands = {
  'pipeline:create': cmd.identity({
    ..._pipelineCommand,
    params: undefined,
    icon: 'Plus',
    execute: ({ctx}) =>
      ctx.setPipelineSheetState({pipeline: undefined, open: true}),
  }),
  'pipeline:edit': cmd.identity({
    ..._pipelineCommand,
    icon: 'Pencil',
    execute: ({params: {pipeline}, ctx}) => {
      ctx.setPipelineSheetState({pipeline, open: true})
    },
  }),
  'pipeline:sync': cmd.identity({
    ..._pipelineCommand,
    icon: 'RefreshCw',
    execute: ({params: {pipeline}, ctx}) => {
      void ctx.withToast(() =>
        ctx.trpcCtx.client.syncPipeline.mutate({id: pipeline.id}),
      )
    },
  }),
  'pipeline:delete': cmd.identity({
    icon: 'Trash',
    ..._pipelineCommand,
    execute: ({ctx, params}) =>
      ctx.setAlertDialogState({
        title: `Confirm deleting pipeline ${params.pipeline.id}`,
        destructive: true,
        // 1) i18n this string so it's shorter and 2) support markdown syntax 3) make user confirm by typing id
        description:
          'Already synchronized data will be untouched. However this will delete any incremental sync state so when a new pipeline is created you will have to sync from scratch.',
        onConfirm: () =>
          ctx.trpcCtx.client.deletePipeline.mutate({id: params.pipeline.id}),
      }),
  }),
} satisfies CommandDefinitionMap<CommandContext>

const _resourceCommand = {
  group: 'resource',
  params: z.object({resource: zClient.resource}),
} satisfies CommandDefinitionInput<CommandContext>

export const resourceCommands = {
  'resource:edit': cmd.identity({
    ..._resourceCommand,
    icon: 'Pencil',
    execute: ({ctx, params}) =>
      ctx.setResourceSheetState({resource: params.resource, open: true}),
  }),
  'resource:delete': cmd.identity({
    icon: 'Trash',
    ..._resourceCommand,
    execute: ({ctx, params}) =>
      ctx.setAlertDialogState({
        title: `Confirm deleting resource ${params.resource.id}`,
        destructive: true,
        // 1) i18n this string so it's shorter and 2) support markdown syntax 3) make user confirm by typing id
        description:
          'Already synchronized data will be untouched. However this will delete any incremental sync state so when a new resource is created you will have to sync from scratch.',
        onConfirm: () =>
          ctx.trpcCtx.client.deleteResource.mutate({id: params.resource.id}),
      }),
  }),
  'resource:sync': cmd.identity({
    ..._resourceCommand,
    icon: 'RefreshCw',
    execute: ({params: {resource}, ctx}) => {
      void ctx.withToast(() =>
        ctx.trpcCtx.client.syncResource.mutate({id: resource.id}),
      )
    },
  }),
  'resource:navigate_sql': cmd.identity({
    ..._resourceCommand,
    icon: 'Database',
    title: 'Run sql',
    // Only show me for postgres resources
    execute: ({params: {resource}, ctx}) => {
      // TODO: Display loading indicator while this is happening...
      ctx.router.push(`/dashboard/resources/${resource.id}/sql`)
    },
  }),
  'resource:navigate_playground': cmd.identity({
    ..._resourceCommand,
    icon: 'Database',
    title: 'Playground',
    // Only show me for postgres resources
    execute: ({params: {resource}, ctx}) => {
      // TODO: Get typecheck to catch bad routes
      ctx.router.push(`/dashboard/resources/${resource.id}/playground`)
    },
  }),

  // TODO: Move this out of the core, now that we have plaid specific operations
  // 'plaid/simulate_disconnect': {
  //   ..._resourceCommand,
  //   icon: 'Unlink',
  //   // Only show me for sandbox plaid resources
  // },
} satisfies CommandDefinitionMap<CommandContext>

/** Generic command that should apply to ANY entity... */
export const entityCommands = {
  copy_id: cmd.identity({
    icon: 'Copy',
    params: z.object({
      pipeline: z.object({id: z.string()}).optional(),
      resource: z.object({id: z.string()}).optional(),
    }),
    useCommand: (initial) => ({
      subtitle: initial.resource?.id ?? initial.pipeline?.id,
      execute: ({params, ctx}) =>
        ctx.withToast(
          () =>
            copyToClipboard(initial.resource?.id ?? params.pipeline?.id ?? ''),
          {
            title: 'Copied to clipboard',
          },
        ),
    }),
  }),
} satisfies CommandDefinitionMap<CommandContext>

const _debugCommand = {
  group: 'debug',
} satisfies CommandDefinitionInput<CommandContext>

export const debugCommands = {
  test_toast: {
    ..._debugCommand,
    execute: ({ctx}) => {
      void ctx.withToast(() => delay(1000).then(() => 'done'), {
        title: 'Hello world',
      })
    },
  },
  test_alert: {
    ..._debugCommand,
    execute: ({ctx}) =>
      ctx.setAlertDialogState({
        title: 'Are you sure?',
        description: 'This is a test',
        onConfirm: () => delay(5000).then(() => 'done'),
      }),
  },
} satisfies CommandDefinitionMap<CommandContext>

const _navCommand = {
  group: 'navigation',
} satisfies CommandDefinitionInput<CommandContext>

// TODO: Dedupe with the links from the navigation sidebar
export const navCommands = {
  go_to_home: {
    ..._navCommand,
    icon: 'Home',
    execute: ({ctx}) => ctx.router.push('/'),
  },
  go_to_settings: {
    ..._navCommand,
    icon: 'Settings',
    execute: ({ctx}) => ctx.router.push('/settings'),
  },
  toggle_dark_mode: {
    // TODO: Give the choice of dark / light / system via an enum somehoe
    // as right now the there are no easy ways to "reset"
    useCommand: () => {
      const {setTheme, resolvedTheme, theme} = useTheme()
      return {
        icon:
          theme === 'dark'
            ? 'SunMedium'
            : theme === 'light'
              ? 'Moon'
              : 'Laptop',
        execute: () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'),
      }
    },
  },
} satisfies CommandDefinitionMap<CommandContext>

export const miscCommands = {
  toggle_dark_mode: {
    // TODO: Give the choice of dark / light / system via an enum somehoe
    // as right now the there are no easy ways to "reset"
    useCommand: () => {
      const {setTheme, resolvedTheme, theme} = useTheme()
      return {
        icon:
          theme === 'dark'
            ? 'SunMedium'
            : theme === 'light'
              ? 'Moon'
              : 'Laptop',
        execute: () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'),
      }
    },
  },
} satisfies CommandDefinitionMap<CommandContext>

export const vDefinitions = {
  ...pipelineCommands,
  ...resourceCommands,
  ...entityCommands,
  ...navCommands,
  ...miscCommands,
  ...(__DEBUG__ && debugCommands),
} satisfies CommandDefinitionMap<CommandContext>
