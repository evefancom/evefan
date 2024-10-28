'use client'

import type {RealtimePostgresChangesPayload} from '@supabase/realtime-js'
import {RealtimeClient} from '@supabase/realtime-js'
import React from 'react'
import {env} from '@openint/app-config/env'
import {_trpcReact} from '@openint/engine-frontend'
import {joinPath} from '@openint/util'
import type {Database} from '../supabase/supabase.gen'

// https://db-dev.venice.is
// wss://db-dev.venice.is/realtime/v1/websocket

export function createRealtimeClient() {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null
  }
  return new RealtimeClient(
    joinPath(
      env.NEXT_PUBLIC_SUPABASE_URL.replace('https', 'wss'),
      'realtime/v1',
    ),
    {params: {apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY}},
  )
}

export function subscribePostgresChanges(
  client: RealtimeClient,
  tableName: keyof Database['public']['Tables'],
  fn: (change: RealtimePostgresChangesPayload<Record<string, unknown>>) => void,
) {
  const sub = client
    // Unique channel name otherwise multiple calls to subscribe would overwrite each other
    .channel(`pg/public.${tableName}.${Date.now()}`)
    .on(
      'postgres_changes',
      {event: '*', schema: 'public', table: tableName},
      (change) => {
        console.log(`[postgres_changes] public.${tableName}`, change)
        fn(change)
      },
    )
    .subscribe()
  console.log(`[postgres_changes] Sub public.${tableName}`)
  return {
    ...sub,
    unsub: () => {
      console.log(`[postgres_changes] Unsub public.${tableName}`)
      void sub.unsubscribe()
    },
  }
}

// MARK: - React

/** Ties to component lifecycle. Prefer global ones for subscription */
export function usePostgresChanges(
  client: RealtimeClient,
  tableName: keyof Database['public']['Tables'],
  fn: (change: RealtimePostgresChangesPayload<Record<string, unknown>>) => void,
) {
  React.useEffect(() => subscribePostgresChanges(client, tableName, fn).unsub)
}

export const InvalidateQueriesOnPostgresChanges = React.memo(
  function InvalidateQueriesOnPostgresChanges(props: {client: RealtimeClient}) {
    const trpcUtils = _trpcReact.useContext()
    console.log('InvalidateQueriesOnPostgresChanges')

    usePostgresChanges(props.client, 'resource', () => {
      console.log('invalidate resources and related')
      void trpcUtils.listResources.invalidate()
      void trpcUtils.listConnections.invalidate()
    })
    usePostgresChanges(props.client, 'pipeline', () => {
      console.log('invalidate pipelines and related')
      void trpcUtils.listPipelines.invalidate()
    })
    usePostgresChanges(props.client, 'connector_config', () => {
      console.log('invalidate integrations and related')
      void trpcUtils.adminListConnectorConfigs.invalidate()
      void trpcUtils.listConnectorConfigInfos.invalidate()
    })
    return null
  },
)
