import Link from 'next/link'
import {cn} from '@/lib-client/ui-utils'

const links: Array<{href: string; title: string}> = [
  {
    title: 'Magic Link',
    href: '/dashboard/magic-link',
  },
  {
    title: 'End users',
    href: '/dashboard/end-users',
  },
  {
    title: 'Connector Configs',
    href: '/dashboard/connector-configs',
  },
  {
    title: 'Resources',
    href: '/dashboard/resources',
  },
  {
    title: 'Pipelines',
    href: '/dashboard/pipelines',
  },
]

export function TopLav({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <nav
      className={cn('flex items-center space-x-4 lg:space-x-6', className)}
      {...props}>
      {links.map((link, i) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            'text-sm font-medium transition-colors hover:text-primary',
            i === 0 && 'text-muted-foreground',
          )}>
          {link.title}
        </Link>
      ))}
    </nav>
  )
}
