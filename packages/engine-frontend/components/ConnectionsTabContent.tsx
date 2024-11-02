import {Loader, Settings} from 'lucide-react'
import {Fragment} from 'react'
import {
  Badge,
  Button,
  ConnectorLogo,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Separator,
} from '@openint/ui'
import type {ConnectorConfig} from '../hocs/WithConnectConfig'

interface ConnectionsTabContentProps {
  connectionCount: number
  categoriesWithConnections: Array<{
    name: string
    connections: Array<{
      id: string
      connectorConfig: ConnectorConfig
      connectorName: string
      pipelineIds: string[]
      syncInProgress: boolean
    }>
  }>
  isLoading: boolean
  deleteResource: ({id}: {id: string}) => void
  onConnect: () => void
}

export function ConnectionsTabContent({
  connectionCount,
  isLoading,
  deleteResource,
  categoriesWithConnections,
  onConnect,
}: ConnectionsTabContentProps) {
  return connectionCount === 0 ? (
    <div className="flex flex-col gap-2 p-4">
      <div>
        <p className="text-base font-semibold">No connections yet</p>
        <p className="text-base">Add a connection to get started</p>
      </div>
      <Button
        onClick={onConnect}
        className="inline-flex h-10 items-center justify-center self-end">
        Connect
      </Button>
    </div>
  ) : (
    <div className="p-4">
      {isLoading ? (
        <div className="flex h-full items-center justify-center">
          <Loader className="size-5 animate-spin text-[#8A5DF6]" />
        </div>
      ) : (
        categoriesWithConnections.map((category) => (
          <div key={category.name} className="flex flex-col space-y-4">
            {category.connections.map((conn) => (
              <Fragment key={conn.id}>
                <div className="flex flex-row justify-between gap-4">
                  <div className="flex flex-row gap-4">
                    <ConnectorLogo
                      connector={conn.connectorConfig.connector}
                      className="size-[64px] rounded-lg"
                    />
                    <div className="flex h-full flex-col justify-center">
                      <div className="flex flex-row items-center gap-2">
                        <h4 className="font-bold">
                          {conn.connectorConfig.connector.displayName
                            .charAt(0)
                            .toUpperCase() +
                            conn.connectorConfig.connector.displayName.slice(1)}
                        </h4>
                        <Badge variant="outline">{category.name}</Badge>
                      </div>
                      {conn.pipelineIds.length > 0 && (
                        <div className="mt-2">
                          {conn.syncInProgress ? (
                            <div className="flex flex-row items-center justify-start gap-2">
                              <Loader className="size-5 animate-spin text-[#8A5DF6]" />
                              <p className="font-semibold">Syncing...</p>
                            </div>
                          ) : (
                            <p>Successfully synced</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <Settings className="size-5 text-[#808080]" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="flex w-[80px] items-center justify-center">
                      <DropdownMenuItem
                        className="flex items-center justify-center"
                        onSelect={() => deleteResource({id: conn.id})}>
                        <span className="text-center font-medium text-red-500">
                          Delete
                        </span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {/* TODO: Improve the condition to hide the separator for the last item, right now it iterates 
        over all categories and all connections, would be good to have a single array of connections with the category 
        information included already */}
                <Separator className="w-full" />
              </Fragment>
            ))}
          </div>
        ))
      )}
    </div>
  )
}
