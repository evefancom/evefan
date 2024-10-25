import {type ReactElement} from 'react'
import {
  Tabs as ShadcnTabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../shadcn/Tabs'

interface TabsProps {
  tabConfig: Array<{
    key: string
    title: string
    content: ReactElement
  }>
  defaultValue: string
}

export function Tabs({tabConfig, defaultValue}: TabsProps) {
  return (
    <ShadcnTabs defaultValue="connections">
      <TabsList>
        {tabConfig.map((config) => (
          <TabsTrigger key={config.key} value={config.key}>
            {config.title}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabConfig.map((config) => (
        <TabsContent
          key={config.key}
          value={config.key}
          defaultValue={defaultValue}>
          {config.content}
        </TabsContent>
      ))}
    </ShadcnTabs>
  )
}
