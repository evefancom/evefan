'use client'

import {ComboboxDemo, CommandInline, CommandPopover} from '@openint/ui'
import {GlobalCommandBar} from '@/vcommands/GlobalCommandBar'
import {useCommandContextValue} from '@/vcommands/vcommand-context'
import {vDefinitions} from '@/vcommands/vcommand-definitions'

export default function ComingSoonPage() {
  const ctx = useCommandContextValue()
  return (
    <div className="p-6">
      <GlobalCommandBar />
      <h2 className="mb-4 text-2xl font-semibold tracking-tight">
        Coming soon
      </h2>

      <div className="m-5 border p-5">
        <CommandPopover
          ctx={ctx}
          definitions={vDefinitions}
          initialParams={{id: 'pipe_123'}}
          hideGroupHeadings
        />
        <ComboboxDemo />
      </div>
      <div className="m-5 border p-5">
        <CommandInline
          ctx={ctx}
          hideGroupHeadings
          definitions={vDefinitions}
          initialParams={{id: 'pipe_123'}}
        />
      </div>
    </div>
  )
}
