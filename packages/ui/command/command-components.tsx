import {MoreHorizontal} from 'lucide-react'
import React from 'react'
import {R} from '@openint/util'
import {Icon} from '../components/Icon'
import type {ButtonProps} from '../shadcn'
import {Button, Popover, PopoverContent, PopoverTrigger} from '../shadcn'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '../shadcn/Command'
import {cn} from '../utils'
import {filterCommands, prepareCommand, prepareCommands} from './command-fns'
import type {_infer, CommandDefinitionMap, CommandDraft} from './command-types'

export interface CommandComponentProps<
  TCtx = any,
  TDefs extends CommandDefinitionMap<TCtx> = CommandDefinitionMap<TCtx>,
> {
  ctx: TCtx
  placeholder?: string
  emptyMessage?: string
  definitions: TDefs
  onSelect?: (key: keyof TDefs) => void
  /** TODO: Better type initialParams from TDefs to be a union of params */
  initialParams?: Record<string, unknown>
  hideGroupHeadings?: boolean
}

export function CommandButton<
  TDef extends CommandDefinitionMap<TCtx>,
  TKey extends keyof TDef,
  TCtx = unknown,
>({
  command: [key, params],
  definitions,
  ctx,
  ...buttonProps
}: {
  definitions: TDef
  command: CommandDraft<TDef, TKey, TCtx>
  ctx: TCtx
} & ButtonProps) {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const _cmd = prepareCommand([key as string, definitions[key]!])
  const cmd = {..._cmd, ..._cmd.useCommand?.(params ?? {})}

  return (
    <Button
      {...buttonProps}
      onClick={(e) => {
        void cmd.execute?.({ctx, params: params ?? {}})
        buttonProps.onClick?.(e)
      }}>
      {cmd.title}
    </Button>
  )
}

function CommandItemContainer({
  command: _cmd,
  onSelect,
  params,
  ctx,
}: {
  command: ReturnType<typeof prepareCommands>['commands'][number]
  params?: Record<string, unknown>
  ctx: unknown
  onSelect?: (value: string) => void
}) {
  const cmd = {..._cmd, ..._cmd.useCommand?.(params ?? {})}
  return (
    <CommandItem
      // Value is used for filtering commands
      // Workaround for https://github.com/pacocoursey/cmdk/issues/140
      value={R.compact([cmd.title, cmd.subtitle, cmd.shortcut]).join(' ')}
      onSelect={(currentValue) => {
        console.log('command selected', currentValue)
        void cmd.execute?.({ctx, params: params ?? {}})
        onSelect?.(currentValue)
      }}>
      {cmd.icon && (
        <Icon
          name={cmd.icon}
          className={cn(
            'mr-2 h-4 w-4 shrink-0',
            cmd.subtitle && 'mt-[2px] self-start',
          )}
        />
      )}
      <div className="flex flex-col gap-1 overflow-hidden">
        <span>{cmd.title}</span>
        {cmd.subtitle && (
          <pre
            title={cmd.subtitle}
            className="overflow-hidden text-ellipsis text-muted-foreground">
            {cmd.subtitle}
          </pre>
        )}
      </div>
      {cmd.shortcut && (
        // Need to render shortcut better... $mod+K => ⌘S
        <CommandShortcut>{cmd.shortcut}</CommandShortcut>
      )}
    </CommandItem>
  )
}

export function CommandContent({
  ctx,
  definitions,
  emptyMessage = 'No commands found.',
  placeholder = 'Search...',
  onSelect,
  initialParams,
  hideGroupHeadings,
}: CommandComponentProps) {
  const {commandGroups} = React.useMemo(() => {
    const prepared = prepareCommands({definitions})
    return filterCommands({
      commands: prepared.commands,
      // Filter regardless because without initialParams we currently only want global commands.
      params: initialParams ?? {},
    })
  }, [definitions, initialParams])

  return (
    <Command>
      <CommandInput placeholder={placeholder} />
      <CommandEmpty>{emptyMessage}</CommandEmpty>
      <CommandList>
        {Object.entries(commandGroups).map(([groupName, commands]) => (
          <CommandGroup
            key={groupName}
            heading={!hideGroupHeadings && groupName}>
            {commands.map((cmd) => (
              <CommandItemContainer
                key={cmd.key}
                ctx={ctx}
                command={cmd}
                onSelect={onSelect}
                params={initialParams}
              />
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </Command>
  )
}

export function CommandInline(props: CommandComponentProps) {
  return (
    <Command>
      <CommandContent {...props} />
    </Command>
  )
}

export function CommandPopover(props: CommandComponentProps) {
  const [open, setOpen] = React.useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <CommandInline
          {...props}
          onSelect={(key) => {
            setOpen(false)
            props.onSelect?.(key)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

/** Automatically registers keyboard shortcut and show command in a dialog */
export function CommandBar(props: CommandComponentProps) {
  const [open, setOpen] = React.useState(false)
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'p' || e.key === 'k') && e.metaKey) {
        setOpen((open) => !open)
        e.preventDefault()
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  return (
    <CommandDialog open={open} onOpenChange={setOpen} className="sm:top-32">
      <CommandContent
        {...props}
        onSelect={(key) => {
          setOpen(false)
          props.onSelect?.(key)
        }}
      />
    </CommandDialog>
  )
}
