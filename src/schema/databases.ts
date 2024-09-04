import {
  DestinationEvent,
  DestinationPageEvent,
  DestinationScreenEvent,
  DestinationTrackEvent,
  DestinationIdentifyEvent,
  DestinationGroupEvent,
  DestinationAliasEvent,
} from './event';

export type FieldType = 'string' | 'timestamp' | 'float' | 'json';

export interface Field {
  name: string;
  type: FieldType;
  path?: string;
  transform?: (e: DestinationEvent) => any;
}

export type Schema = {
  fields: Field[];
};

export const schema: Schema = {
  fields: [
    { name: 'id', type: 'string', path: 'messageId' },
    { name: 'type', type: 'string', path: 'type' },
    { name: 'timestamp', type: 'timestamp', path: 'timestamp' },
    {
      name: 'properties',
      type: 'json',
      transform: (e: DestinationEvent) => {
        const props: Record<string, any> = {
          sent_at: e.sentAt,
          original_timestamp: e.timestamp,
        };

        switch (e.type) {
          case 'page':
            const pageEvent = e as DestinationPageEvent;
            Object.assign(props, {
              name: pageEvent.name,
              category: pageEvent.category,
              path: pageEvent.properties?.path,
              referrer: pageEvent.properties?.referrer,
              search: pageEvent.properties?.search,
              title: pageEvent.properties?.title,
              url: pageEvent.properties?.url,
              ...pageEvent.extraParams.properties,
            });
            break;
          case 'screen':
            const screenEvent = e as DestinationScreenEvent;
            Object.assign(props, {
              name: screenEvent.name,
              category: screenEvent.category,
              ...screenEvent.properties,
              ...screenEvent.extraParams.properties,
            });
            break;
          case 'track':
            const trackEvent = e as DestinationTrackEvent;
            Object.assign(props, {
              event: trackEvent.event,
              ...trackEvent.properties,
              ...trackEvent.extraParams.properties,
            });
            break;
          case 'identify':
            const identifyEvent = e as DestinationIdentifyEvent;
            Object.assign(props, {
              ...identifyEvent.traits,
              ...identifyEvent.extraParams.properties,
            });
            break;
          case 'group':
            const groupEvent = e as DestinationGroupEvent;
            Object.assign(props, {
              groupId: groupEvent.groupId,
              ...groupEvent.traits,
              ...groupEvent.extraParams.properties,
            });
            break;
          case 'alias':
            const aliasEvent = e as DestinationAliasEvent;
            Object.assign(props, {
              previousId: aliasEvent.previousId,
              ...aliasEvent.extraParams.properties,
            });
            break;
        }

        return props;
      },
    },
    {
      name: 'metadata',
      type: 'json',
      transform: (e: DestinationEvent) => ({
        receivedAt: new Date().toISOString(),
        ...e._metadata,
      }),
    },
    {
      name: 'context',
      type: 'json',
      transform: (e: DestinationEvent) => ({
        ...e.context,
        campaign: {
          ...e.context?.campaign,
          ...e.extraParams.campaign,
        },
        userAgent: e.userAgent,
        location: e.location,
        ...e.extraParams.context,
      }),
    },
    { name: 'user_id', type: 'string', path: 'userId' },
    { name: 'anonymous_id', type: 'string', path: 'anonymousId' },
    { name: 'external_id', type: 'string', path: 'externalId' },
    { name: 'value', type: 'float' },
    { name: 'partition_key', type: 'string' },
    {
      name: 'extra_fields',
      type: 'json',
      transform: (e: DestinationEvent) => ({
        integrations: e.integrations,
        writeKey: e.writeKey,
      }),
    },
  ],
};
