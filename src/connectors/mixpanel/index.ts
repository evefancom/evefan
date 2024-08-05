import { MixpanelConfig, MixpanelDestination } from '@evefan/evefan-config';
import { Connector } from '..';
import { WorkerConfig } from '../../config';
import {
  DestinationAliasEvent,
  DestinationEvent,
  DestinationIdentifyEvent,
  DestinationPageEvent,
  DestinationScreenEvent,
  DestinationTrackEvent,
} from '../../event';
import {
  propertyWithPath,
  removeKeysFromObject,
  toUnixTimestampInMS,
} from '../../utils';
import { FanOutResult } from '../../writer';
import { mapping } from './config';
import { constructPayload } from './mapper';

const DESTINATION_TYPE = 'mixpanel';

interface MixpanelRequest {
  url: string;
  data: {
    body: Record<string, any>[];
    headers: Record<string, string>;
  };
  ids: string[];
  type: 'engage' | 'group' | 'import';
}

interface MixpanelResponse {
  code?: number;
  num_records_imported?: number;
  status: string | number;
  error?: string;
  failed_records?: Array<{
    index: number;
    $insert_id: string;
    field: string;
    message: string;
  }>;
}

const buildUtmParams = (event: DestinationEvent) => {
  return {
    utm_medium: event.context.campaign?.medium,
    utm_source: event.context.campaign?.source,
    utm_campaign: event.context.campaign?.name,
    utm_content: event.context.campaign?.content,
    utm_term: event.context.campaign?.term,
  };
};

const transformTrackEvent = (
  config: MixpanelConfig,
  event: DestinationTrackEvent
) => {
  const mappedProperties = constructPayload(event, mapping.event);

  // This is to conform with SDKs sending timestamp component with messageId
  // example: "1662363980287-168cf720-6227-4b56-a98e-c49bdc7279e9"
  if (mappedProperties.$insert_id) {
    mappedProperties.$insert_id = mappedProperties.$insert_id.slice(-36);
  }

  const unixTimestamp = toUnixTimestampInMS(
    event.originalTimestamp || event.timestamp
  );
  let properties = {
    ...event.properties,
    ...propertyWithPath(event, 'context.traits'),
    ...mappedProperties,
    token: config._secret_credentials.token,
    distinct_id: event.userId || event.anonymousId,
    time: unixTimestamp,
    ...buildUtmParams(event),
  };

  if (config.identityMerge === 'simplified') {
    properties = {
      ...properties,
      distinct_id: event.userId || `$device:${event.anonymousId}`,
      $device_id: event.anonymousId,
      $user_id: event.userId,
    };
  }

  return {
    event: event.event,
    properties,
  };
};

const transformIdentifyEvent = (
  config: MixpanelConfig,
  event: DestinationIdentifyEvent
) => {
  let payload = constructPayload(event, mapping.identify);

  if (!payload.$name && payload.$first_name && payload.$last_name) {
    payload.$name = `${payload.$first_name} ${payload.$last_name}`;
  }

  if (config.identityMerge === 'simplified') {
    payload.$distinct_id = event.userId || `$device:${event.anonymousId}`;
  }

  return payload;
};

const transformPageOrScreenEvent = (
  config: MixpanelConfig,
  event: DestinationPageEvent | DestinationScreenEvent
) => {
  const mappedProperties = constructPayload(event, mapping.event);

  let properties: Record<string, any> = {
    ...event.properties,
    ...mappedProperties,
    token: config._secret_credentials.token,
    distinct_id: event.userId || event.anonymousId,
    time: toUnixTimestampInMS(event.timestamp),
    ...buildUtmParams(event),
  };

  if (config.identityMerge === 'simplified') {
    properties = {
      ...properties,
      distinct_id: event.userId || `$device:${event.anonymousId}`,
      $device_id: event.anonymousId,
      $user_id: event.userId,
    };
  }
  if (event.name) {
    properties.name = event.name;
  }
  if (event.category) {
    properties.category = event.category;
  }

  let eventName;
  if (event.type === 'page') {
    eventName = 'Loaded a Page';
  } else {
    eventName = 'Loaded a Screen';
  }

  return {
    event: eventName,
    properties,
  };
};

const transformAliasEvent = (
  config: MixpanelConfig,
  event: DestinationAliasEvent
) => {
  return {
    event: '$create_alias',
    properties: {
      distinct_id: event.previousId || event.anonymousId,
      alias: event.userId,
      token: config._secret_credentials.token,
    },
  };
};

const transformEvents = (
  config: MixpanelConfig,
  events: DestinationEvent[]
) => {
  const importRequests: Record<string, any>[] = [];
  const engageRequests: Record<string, any>[] = [];
  const groupRequests: Record<string, any>[] = [];

  events.forEach((event) => {
    if (event.type === 'track') {
      importRequests.push({
        id: event.messageId,
        ...transformTrackEvent(config, event),
      });
    } else if (event.type === 'identify') {
      // Engage request for profile update
      engageRequests.push({
        id: event.messageId,
        $token: config._secret_credentials.token,
        $distinct_id: event.userId || event.anonymousId,
        $set: transformIdentifyEvent(config, event),
      });

      // Additional import event based on identityMerge config
      if (config.identityMerge === 'original') {
        importRequests.push({
          id: event.messageId,
          event: '$merge',
          properties: {
            $distinct_ids: [event.userId, event.anonymousId],
            token: config._secret_credentials.token,
          },
        });
      }
    } else if (event.type === 'page' || event.type === 'screen') {
      importRequests.push({
        id: event.messageId,
        ...transformPageOrScreenEvent(config, event),
      });
    } else if (event.type === 'alias' && config.identityMerge === 'original') {
      importRequests.push({
        id: event.messageId,
        ...transformAliasEvent(config, event),
      });
    } else if (event.type === 'group') {
      engageRequests.push({
        id: event.messageId,
        $token: config._secret_credentials.token,
        $distinct_id:
          config.identityMerge === 'original'
            ? event.userId || event.anonymousId
            : event.userId || `$device:${event.anonymousId}`,
        $set: {
          $group_id: event.groupId,
        },
      });
      groupRequests.push({
        id: event.messageId,
        $token: config._secret_credentials.token,
        $group_key: 'groupId',
        $group_id: event.groupId,
        $set: {
          ...event.traits,
        },
      });
    }
  });

  const requests: MixpanelRequest[] = [];

  // Batch engage requests
  if (engageRequests.length > 0) {
    requests.push({
      url: `https://${config.region}.mixpanel.com/engage?strict=${Number(
        config.strict
      )}#profile-set`,
      data: {
        body: engageRequests.map((r) => removeKeysFromObject(r, ['id'])),
        headers: {
          'Content-Type': 'application/json',
        },
      },
      ids: engageRequests.map((r) => r.id),
      type: 'engage',
    });
  }

  // Batch group requests
  if (groupRequests.length > 0) {
    requests.push({
      url: `https://${config.region}.mixpanel.com/groups?verbose=1#group-set`,
      data: {
        body: groupRequests.map((r) => removeKeysFromObject(r, ['id'])),
        headers: {
          'Content-Type': 'application/json',
        },
      },
      ids: groupRequests.map((r) => r.id),
      type: 'group',
    });
  }

  // Batch imported events
  if (importRequests.length > 0) {
    requests.push({
      url: `https://${config.region}.mixpanel.com/import?strict=${Number(
        config.strict
      )}&project_id=${config.projectId}`,
      data: {
        body: importRequests.map((r) => removeKeysFromObject(r, ['id'])),
        headers: {
          'Content-Type': 'application/json',
          Authorization:
            'Basic ' + btoa(config._secret_credentials.token + ':'),
        },
      },
      ids: importRequests.map((r) => r.id),
      type: 'import',
    });
  }

  return requests;
};

export default class MixpanelConnector implements Connector {
  async write(
    config: WorkerConfig,
    events: DestinationEvent[]
  ): Promise<FanOutResult> {
    const destination = config.destinations.find(
      (d) => d.type === DESTINATION_TYPE
    ) as MixpanelDestination;

    if (!destination) {
      console.error('Could not find mixpanel Config');
      return {
        destinationType: 'mixpanel',
        failedEvents: events.map((e) => ({
          error: 'Destination config not found',
          body: e,
        })),
      };
    }

    console.log(
      `${DESTINATION_TYPE}: sending ${events.length} event(s) to Mixpanel`
    );

    const eventMap = events.reduce((acc, event) => {
      acc[event.messageId] = event;
      return acc;
    }, {} as Record<string, DestinationEvent>);

    try {
      const requests = transformEvents(destination.config, events);

      const failedEvents = (
        await Promise.all(
          requests.map(async (request) => {
            const res = await fetch(request.url, {
              headers: request.data.headers,
              method: 'POST',
              body: JSON.stringify(request.data.body),
            });

            const response = await res.json<MixpanelResponse>();

            if (request.type === 'engage' || request.type === 'group') {
              if (response.status === 0) {
                console.error(
                  `${DESTINATION_TYPE}: error while sending event to Mixpanel`,
                  res
                );
                return request.ids.map((id) => ({
                  body: eventMap[id],
                  error: response.error || 'Unknown mixpanel processing error',
                }));
              }
            } else if (request.type === 'import') {
              if (response.code !== 200) {
                if (
                  response.code !== 200 ||
                  response.status?.toString().toLowerCase() !== 'success' ||
                  response.num_records_imported !== request.data.body.length
                ) {
                  console.error(
                    `${DESTINATION_TYPE}: error while sending event to Mixpanel`,
                    res
                  );
                  if (
                    response.failed_records &&
                    response.failed_records.length > 0
                  ) {
                    return response.failed_records.map((r) => ({
                      body: eventMap[request.ids[r.index]],
                      error: r.message,
                    }));
                  }
                  return request.ids.map((id) => ({
                    body: eventMap[id],
                    error: 'Unknown mixpanel processing error',
                  }));
                }
              }
            }
            return [];
          })
        )
      ).flat();

      return {
        destinationType: 'mixpanel',
        failedEvents,
      };
    } catch (error: any) {
      return {
        destinationType: 'mixpanel',
        failedEvents: events.map((e) => ({
          error: error?.message || 'Unknown error',
          body: e,
        })),
      };
    }
  }
}
