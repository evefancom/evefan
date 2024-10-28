'use client'

import {DataTable} from '@openint/ui'
import {trpcReact} from '@/lib-client/trpcReact'
import {VCommandButton, VCommandMenu} from '@/vcommands/vcommand-components'

export default function PipelinesPage() {
  const res = trpcReact.listPipelines.useQuery()

  ;(globalThis as any).listPipelinesRes = res

  return (
    <div className="p-6">
      <header className="flex items-center">
        <h2 className="mb-4 mr-auto text-2xl font-semibold tracking-tight">
          Pipelines
        </h2>
        <VCommandButton command={['pipeline:create', {}]} />
      </header>
      <p>
        Pipelines connect resources together by syncing data from source
        resource to destination resource
      </p>
      <DataTable
        query={res}
        columns={[
          {
            id: 'actions',
            enableHiding: false,
            cell: ({row}) => (
              <VCommandMenu initialParams={{pipeline: row.original}} />
            ),
          },
          {accessorKey: 'id'},
          {accessorKey: 'sourceId'},
          {accessorKey: 'destinationId'},
        ]}
      />
    </div>
  )
}
