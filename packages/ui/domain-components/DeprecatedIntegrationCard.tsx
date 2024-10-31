import {Landmark} from 'lucide-react'
import React from 'react'
import type {Id} from '@openint/cdk'
import type {RouterOutput} from '@openint/engine-backend'
import {Badge, Card} from '../shadcn'
import {cn} from '../utils'

/** Can be img or next/image component */
type ImageComponent = React.FC<
  Omit<
    React.DetailedHTMLProps<
      React.ImgHTMLAttributes<HTMLImageElement>,
      HTMLImageElement
    >,
    'loading' | 'ref'
  >
>

interface UIPropsNoChildren {
  className?: string
  Image?: ImageComponent
}

interface UIProps extends UIPropsNoChildren {
  children?: React.ReactNode
}

type Integration = RouterOutput['listConfiguredIntegrations']['items'][number]

export const DeprecatedIntegrationCard = ({
  integration: int,
  className,
  children,
  onClick,
  ...uiProps
}: UIProps & {
  integration: Integration & {
    connectorName: string
    connectorConfigId?: Id['ccfg']
    envName?: string | null
  }
  className?: string
  onClick?: () => void
}) => (
  // <ConnectorCard
  //   {...props}
  //   showName={false}
  //   labels={int.envName ? [int.envName] : []}
  // />
  <Card
    className={cn(
      'm-3 flex h-36 w-48 flex-col p-4 sm:h-48 sm:w-64',
      'cursor-pointer rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-600',
      className,
    )}
    onClick={onClick}>
    <div className="flex h-6 self-stretch">
      {int.envName && (
        <Badge key={int.envName} variant="secondary">
          {int.envName}
        </Badge>
      )}
      {/* {showStageBadge && (
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
      )} */}
    </div>
    <IntegrationLogoTemp
      {...uiProps}
      integration={int}
      // min-h-0 is a hack where some images do not shrink in height @see https://share.cleanshot.com/jMX1bzLP
      className="h-12 min-h-0 w-12"
    />
    <span className="mt-2 text-sm text-muted-foreground">{int.name}</span>
    {/* {children} */}
  </Card>
)

/** Dedupe me with ResourceCard.IntegrationLogo */
const IntegrationLogoTemp = ({
  integration: int,
  className,
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  Image = (props) => <img {...props} />,
}: UIPropsNoChildren & {
  integration: Integration
}) =>
  int.logo_url ? (
    <Image
      // width={100}
      // height={100}
      src={int.logo_url}
      alt={`"${int.name}" logo`}
      className={cn('object-contain', className)}
    />
  ) : (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      {/* <span>{int.name}</span> */}
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary">
        <Landmark className="h-8 w-8 text-primary-foreground" />
      </div>
    </div>
  )
