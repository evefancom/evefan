import {
  WithConnectConfig,
  type ConnectorConfigFilters,
} from '../hocs/WithConnectConfig'
import {IntegrationSearch} from './IntegrationSearch'

export function ConnectIntegrations({
  connectorConfigFilters,
  connectorNames = [],
  onEvent,
}: {
  connectorConfigFilters: ConnectorConfigFilters
  connectorNames?: string[]
  onEvent: (event: any) => void
}) {
  return (
    <WithConnectConfig {...connectorConfigFilters}>
      {({ccfgs}) => {
        const filteredCcfgs = ccfgs.filter(
          (c) => !connectorNames.includes(c.connectorName),
        )

        return (
          <IntegrationSearch
            connectorConfigs={filteredCcfgs}
            onEvent={(e) => {
              if (onEvent) onEvent(e)
            }}
          />
        )
      }}
    </WithConnectConfig>
  )
}
