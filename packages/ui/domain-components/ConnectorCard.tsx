import React from 'react'
import type {Id} from '@openint/cdk'
import type {RouterOutput} from '@openint/engine-backend'
import {R} from '@openint/util'
import {Badge, Card} from '../shadcn'
import {cn} from '../utils'

/** Can be img or next/image component */
export type ImageComponent = React.FC<
  Omit<
    React.DetailedHTMLProps<
      React.ImgHTMLAttributes<HTMLImageElement>,
      HTMLImageElement
    >,
    'loading' | 'ref'
  >
>

export interface UIPropsNoChildren {
  className?: string
  Image?: ImageComponent
}

export interface UIProps extends UIPropsNoChildren {
  children?: React.ReactNode
}

export type ConnectorMeta = RouterOutput['listConnectorMetas'][string]

export const ConnectorConfigCard = ({
  connectorConfig: ccfg,
  ...props
}: React.ComponentProps<typeof ConnectorCard> & {
  connectorConfig: {
    id: Id['ccfg']
    connectorName: string
    config?: Record<string, unknown> | null
    envName?: string | null
    disabled?: boolean
  }
}) => (
  <ConnectorCard
    {...props}
    showName={false}
    labels={R.compact([ccfg.envName, ccfg.disabled && 'disabled'])}
  />
)

export const ConnectorCard = ({
  connector,
  showStageBadge = false,
  showName = true,
  labels = [],
  className,
  children,
  ...uiProps
}: UIProps & {
  connector: ConnectorMeta
  showStageBadge?: boolean
  labels?: string[]
  showName?: boolean
}) => (
  <Card
    className={cn(
      'm-3 flex h-36 w-36 flex-col items-center p-2 sm:h-48 sm:w-48',
      className,
    )}>
    <div className="flex h-6 self-stretch">
      {showName && (
        <span className="text-sm text-muted-foreground">{connector.name}</span>
      )}
      {labels.map((label) => (
        <Badge key={label} variant="secondary">
          {label}
        </Badge>
      ))}
      {showStageBadge && (
        <Badge
          variant="secondary"
          className={cn(
            'ml-auto',
            connector.stage === 'ga' && 'bg-green-200',
            connector.stage === 'beta' && 'bg-blue-200',
            connector.stage === 'alpha' && 'bg-pink-50',
          )}>
          {connector.stage}
        </Badge>
      )}
    </div>
    <ConnectorLogo
      {...uiProps}
      connector={connector}
      // min-h-0 is a hack where some images do not shrink in height @see https://share.cleanshot.com/jMX1bzLP
      className="min-h-0 grow"
    />
    {children}
  </Card>
)

export const ConnectorLogo = ({
  connector,
  className,
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  Image = (props) => <img {...props} />,
}: UIPropsNoChildren & {
  connector: ConnectorMeta
}) =>
  connector.logoUrl ? (
    <Image
      width={100}
      height={100}
      src={connector.logoUrl}
      alt={`"${connector.displayName}" logo`}
      className={cn('object-contain', className)}
    />
  ) : (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <span>{connector.displayName}</span>
    </div>
  )
