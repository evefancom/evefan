'use client'

import '@glideapps/glide-data-grid/dist/index.css'
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type {GridCell, GridColumn, Item} from '@glideapps/glide-data-grid'
import {DataEditor, GridCellKind} from '@glideapps/glide-data-grid'
import type {UseQueryResult} from '@tanstack/react-query'
import React from 'react'
import {produce} from '@openint/util'
import {cn} from '../utils'

interface DataGridProps<TData extends Record<string, unknown>> {
  query: UseQueryResult<TData[]>
  className?: string
}

export function DataGrid<TData extends Record<string, unknown>>({
  className,
  query,
}: DataGridProps<TData>) {
  // Grid columns may also provide icon, overlayIcon, menu, style, and theme overrides

  const rows = React.useMemo(() => query.data ?? [], [query.data])

  const [columns, setColumns] = React.useState<GridColumn[]>([])
  React.useLayoutEffect(() => {
    setColumns(
      Object.keys(rows[0] ?? {}).map(
        (key): GridColumn => ({id: key, title: key}),
      ),
    )
  }, [rows])

  // If fetching data is slow you can use the DataEditor ref to send updates for cells
  // once data is loaded.

  function getData([colIdx, rowIdx]: Item): GridCell {
    const col = columns[colIdx]!
    // if (!col) {
    //   debugger
    //   console.error('missing column', colIdx)
    // }
    const row = rows[rowIdx]!
    const cell = row[col.id!]
    const data = !cell
      ? ''
      : typeof cell === 'string'
        ? cell
        : JSON.stringify(cell)

    // Unfortunately copying of JSON value is really not going to work well
    // as they are escaped poorly for our purposes...
    // @see https://github.com/glideapps/glide-data-grid/blob/main/packages/core/src/data-editor/data-editor-fns.ts#L232-L263
    return {
      kind: GridCellKind.Text,
      allowOverlay: false,
      data,
      displayData: data,
    }
  }

  if (query.fetchStatus === 'fetching') {
    return <DataGridSkeleton />
  }

  if (query.status === 'error') {
    return <div>Error: {`${query.error}`}</div>
  } else if (query.status === 'loading') {
    // isLoading = isPending @see https://github.com/TanStack/query/discussions/4252
    return null
  }
  // Query status is guaranteed success now

  if (!columns.length) {
    return <div>No data</div>
  }

  return (
    <DataEditor
      className={cn(query.isFetching && 'opacity-70', className)}
      getCellContent={getData}
      getCellsForSelection={true} // Enables copy
      copyHeaders
      columns={columns}
      rows={rows.length}
      smoothScrollX
      smoothScrollY
      onColumnResize={(col, newSize) => {
        // console.log('col resize', col, newSize)
        setColumns((existing) =>
          produce(existing, (draft) => {
            const c = draft.find((c) => c.id === col.id)
            if (c) {
              // @ts-expect-error
              c.width = newSize
            }
          }),
        )
      }}
      // theme={VeniceDataGridTheme}
    />
  )
}

export function DataGridSkeleton() {
  return (
    <ul className="w-full animate-pulse will-change-auto">
      <DataGridSkeletonRow bgColor="bg-venice-black-500" />
      <DataGridSkeletonRow bgColor="bg-venice-black-400" />
      <DataGridSkeletonRow bgColor="bg-venice-black-300" />
    </ul>
  )
}

interface DataGridSkeletonRowProps {
  // tailwind bg-{color}
  bgColor: string
}

function DataGridSkeletonRow(props: DataGridSkeletonRowProps) {
  const {bgColor} = props
  const square = <div className={cn('h-4 w-4 rounded', bgColor)} />
  const rect = <div className={cn('h-4 w-[5rem] rounded', bgColor)} />
  return (
    <li className="flex justify-between border-b border-venice-gray-muted/50">
      <div className="shrink-0 px-3 py-2">{square}</div>
      <div className="flex grow justify-center px-3 py-2">{rect}</div>
      <div className="flex grow justify-center px-3 py-2">{rect}</div>
      <div className="flex grow justify-center px-3 py-2">{rect}</div>
      <div className="flex grow-[3] justify-center px-3 py-2">{rect}</div>
    </li>
  )
}
