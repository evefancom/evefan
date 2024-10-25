'use client'

import {useQuery} from '@tanstack/react-query'
import {ChevronDown, Loader2} from 'lucide-react'
import React from 'react'
import {
  getServerUrl,
  kAcceptUrlParam,
  kApikeyUrlParam,
} from '@openint/app-config/constants'
import type {Id} from '@openint/cdk'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Kbd,
  Resizable,
  ScrollArea,
  useWithToast,
} from '@openint/ui'
import type {Editor} from '@openint/ui/components/CodeEditor'
import {CodeEditor} from '@openint/ui/components/CodeEditor'
import {DataGrid} from '@openint/ui/components/DataGrid'
import {NoSSR} from '@/components/NoSSR'

const qListTable = `
  SELECT table_name, table_type FROM information_schema.tables
  WHERE table_schema = 'public' ORDER BY table_name
`

function sqlUrl(opts: {
  resourceId: Id['reso']
  query: string
  format?: 'csv' | 'json'
  download?: boolean
  apikey: string
}) {
  const url = new URL(
    `/api/resources/${opts.resourceId}/sql`,
    getServerUrl(null),
  )
  url.searchParams.set('q', opts.query)
  url.searchParams.set(kApikeyUrlParam, opts.apikey)
  if (opts.format) {
    url.searchParams.set(kAcceptUrlParam, opts.format)
  }
  if (opts.download) {
    url.searchParams.set('dl', '1')
  }
  return url
}

export function SqlPage({
  resourceId,
  apikey,
}: {
  resourceId: Id['reso']
  apikey: string
}) {
  const [queryText, setQueryText] = React.useState('')

  const res = useQuery<Array<Record<string, unknown>>>({
    queryKey: ['sql', resourceId, queryText],
    queryFn: () =>
      fetch(sqlUrl({apikey, resourceId, query: queryText})).then((r) =>
        r.json(),
      ),
    // Don't cache at all, sql editor always want fresh data
    cacheTime: 0, // aka gcTime
    staleTime: 0,
    // manual fetching only
    enabled: false,
    // this is needed so the output is not wiped when selecting a different query
    keepPreviousData: true,
  })
  const listTablesRes = useQuery({
    // cacheTime: 0, // aka gcTime
    // staleTime: 0,
    refetchOnMount: true,
    queryKey: ['sql', resourceId, qListTable],
    queryFn: () =>
      fetch(sqlUrl({apikey, resourceId, query: qListTable})).then(
        (r) =>
          r.json() as Promise<
            Array<{table_name: string; table_type: 'BASE TABLE' | 'VIEW'}>
          >,
      ),
    select: (rows) => ({
      Views: rows.filter((r) => r.table_type === 'VIEW'),
      Tables: rows.filter((r) => r.table_type === 'BASE TABLE'),
    }),
  })

  const {withToast} = useWithToast()

  function resultsUrl(opts: {format?: 'csv' | 'json'; download?: boolean}) {
    return sqlUrl({...opts, apikey, resourceId, query: queryText}).toString()
  }

  const editorRef = React.useRef<Editor | null>(null)

  return (
    <div className="flex h-[100%] flex-col">
      <Breadcrumb className="p-4">
        <BreadcrumbItem>
          {/* We need typed routes... https://github.com/shadcn/ui/pull/133 */}
          <BreadcrumbLink href="/resources">Resources</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem>
          <BreadcrumbLink>{resourceId}</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>
          <BreadcrumbLink href={`/resources/${resourceId}/sql`}>
            SQL Explorer
          </BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>

      <div className="flex grow flex-col overflow-hidden">
        <Resizable
          defaultSize={{height: '50%', width: '100%'}}
          className="flex border-b-2 px-6">
          <ScrollArea className="w-32">
            {listTablesRes.isFetching && <Loader2 className="animate-spin" />}
            {Object.entries(listTablesRes.data ?? {}).map(([title, tables]) =>
              !tables.length ? null : (
                <div key={title}>
                  <div className="mb-2 font-medium">{title}</div>
                  {tables.map((t) => (
                    <a
                      className="block cursor-pointer px-1 pl-2 hover:underline"
                      key={t.table_name}
                      onClick={() =>
                        setQueryText(`SELECT * FROM ${t.table_name} LIMIT 5`)
                      }>
                      {t.table_name}
                    </a>
                  ))}
                </div>
              ),
            )}
          </ScrollArea>
          <div className="grow">
            <CodeEditor
              ref={editorRef}
              language="sql"
              value={queryText}
              onChange={(newText) => setQueryText(newText ?? '')}
              setKeybindings={(monaco) => [
                {
                  key: monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
                  run: () => res.refetch(),
                },
              ]}
            />
          </div>
        </Resizable>
        <div className="h-[100%] min-h-[100px] px-6">
          <div className="flex items-center p-1">
            {/* Consider turning this dropdown menu into commands also */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex px-1 text-secondary-foreground">
                Results
                <ChevronDown className="ml-2" />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  onClick={() =>
                    withToast(
                      () =>
                        navigator.clipboard.writeText(
                          `=IMPORTDATA("${resultsUrl({format: 'csv'})}")`,
                        ),
                      {title: 'Copied to clipboard'},
                    )
                  }>
                  Copy Google Sheets IMPORTDATA formula
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    withToast(
                      () =>
                        navigator.clipboard.writeText(
                          resultsUrl({format: 'csv'}),
                        ),
                      {title: 'Copied to clipboard'},
                    )
                  }>
                  Copy CSV URL
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    withToast(
                      () =>
                        navigator.clipboard.writeText(
                          resultsUrl({format: 'json'}),
                        ),
                      {title: 'Copied to clipboard'},
                    )
                  }>
                  Copy JSON URL
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a
                    href={resultsUrl({download: true, format: 'csv'})}
                    target="_blank"
                    rel="noreferrer">
                    Download CSV
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a
                    href={resultsUrl({download: true, format: 'json'})}
                    target="_blank"
                    rel="noreferrer">
                    Download JSON
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              className="ml-auto"
              onClick={() =>
                editorRef.current
                  ?.getAction('editor.action.formatDocument')
                  ?.run()
              }>
              Format
              <Kbd shortcut="⌥ ⇧ F" />
            </Button>
            <Button
              variant="secondary"
              className="ml-3"
              onClick={() => res.refetch()}
              disabled={res.isFetching}>
              {res.isFetching && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              RUN
              {!res.isFetching && <Kbd shortcut="⌘ ⏎" />}
            </Button>
            {/* Toolbar with dropdown "download" & copy result url,  run button */}
          </div>
          <NoSSR>
            <DataGrid className="grow" query={res} />
          </NoSSR>
        </div>
      </div>
    </div>
  )
}
