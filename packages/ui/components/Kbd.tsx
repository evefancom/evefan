import {cn} from '../utils'

export function Kbd(props: {
  shortcut: string
  border?: boolean
  className?: string
}) {
  return (
    <kbd
      className={cn(
        'pointer-events-none inline-flex h-5 select-none items-center gap-1 px-1.5 font-mono font-medium text-muted-foreground opacity-100',
        props.border && 'rounded border bg-muted',
        props.className,
      )}>
      {props.shortcut}
    </kbd>
  )
}
