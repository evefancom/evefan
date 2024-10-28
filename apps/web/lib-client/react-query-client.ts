import {createSyncStoragePersister} from '@tanstack/query-sync-storage-persister'
import {QueryClient} from '@tanstack/react-query'
import {persistQueryClient} from '@tanstack/react-query-persist-client'
import {__DEBUG__} from '@openint/app-config/constants'

export function createQueryClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // refetchOnMount: false,
        // refetchOnReconnect: false,
        // How do we configure it that the only time we "refetch" is when we cmd+r reload the window?
        // We still want to stale-while-revalidate though and thus we persist the query cache.

        // No longer need to refetch now that we always get data from server first
        staleTime: 5 * 60 * 1000, // 5 mins by default, reduce refetching...
        // Too many requests for going between devTool and not... alternative is to change the stale time
        refetchOnWindowFocus: !__DEBUG__,
        refetchOnMount: !__DEBUG__,
      },
    },
  })
  if (
    typeof window !== 'undefined' &&
    !window.location.href.includes('localhost')
  ) {
    const persister = createSyncStoragePersister({storage: window.localStorage})
    // persistor.removeClient() // Will clean up cache

    // Change buster if we change the format of the data to avoid crashes
    // also we should clear any persisted data if userId ever changes
    // Should check against userId and version
    void persistQueryClient({queryClient, persister, buster: undefined})
    console.log('Persist query client...')
  }
  return queryClient
}
