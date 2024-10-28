import * as lucide from 'lucide-react'

export type IconName = Exclude<
  keyof typeof lucide,
  | 'default'
  | 'IconNode'
  | 'Icon'
  | 'createLucideIcon'
  | 'LucideIcon'
  | 'LucideProps'
  | `Lucide${string}`
  | `${string}Icon`
>

export function Icon(props: {name: IconName} & lucide.LucideProps) {
  const LucideIcon = lucide[props.name]
  return <LucideIcon {...props} />
}
