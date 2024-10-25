import {
  DestinationType,
  MixpanelConfig,
  MixpanelDestination,
} from '@evefan/evefan-config';
import { Connector } from '..';
import { GatewayConfig } from '../../config';
import {
  DestinationAliasEvent,
  DestinationEvent,
  DestinationIdentifyEvent,
  DestinationPageEvent,
  DestinationScreenEvent,
  DestinationTrackEvent,
} from '../../schema/event';
import { removeKeysFromObject, toUnixTimestampInMS } from '../../utils';
import { FanOutResult } from '../../writer';
import { mapping } from './config';
import { constructPayload } from './mapper';
import moment from 'moment';

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
    utm_medium: event.context?.campaign?.medium,
    utm_source: event.context?.campaign?.source,
    utm_campaign: event.context?.campaign?.name,
    utm_content: event.context?.campaign?.content,
    utm_term: event.context?.campaign?.term,
  };
};

/**
 * Transforms a base event to a mixpanel event
 * @param config Mixpanel config
 * @param event Destination event
 * @returns Mixpanel event payload
 */
const transformBaseEvent = (
  config: MixpanelConfig,
  event: DestinationTrackEvent | DestinationPageEvent | DestinationScreenEvent
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
  let properties: Record<string, any> = {
    ...event.properties,
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

  if (event.context?.device) {
    const { type, token } = event.context.device;
    if (['ios', 'watchos', 'ipados', 'tvos'].includes(type.toLowerCase())) {
      const payload = constructPayload(event, mapping.profile.ios);
      properties = {
        ...properties,
        ...payload,
      };
      if (token) {
        properties.$ios_devices = [token];
      }
    } else if (type.toLowerCase() === 'android') {
      const payload = constructPayload(event, mapping.profile.android);
      properties = {
        ...properties,
        ...payload,
      };
      if (token) {
        properties.$android_devices = [token];
      }
    }
  }

  if (event.userAgent.browserFamily) {
    properties.$browser = event.userAgent.browserFamily;
    properties.$browser_version = event.userAgent.browserVersion;
  }

  return properties;
};

/**
 * Transforms a track event to a mixpanel event
 * @param config Mixpanel config
 * @param event Destination track event
 * @returns Mixpanel event payload
 */
const transformTrackEvent = (
  config: MixpanelConfig,
  event: DestinationTrackEvent
) => {
  let properties = transformBaseEvent(config, event);

  return {
    event: event.event,
    properties,
  };
};

/**
 * Transforms an identify event to a mixpanel identity update payload
 * @param config Mixpanel config
 * @param event Destination identify event
 * @returns Mixpanel identity update payload
 */
const transformIdentifyEvent = (
  config: MixpanelConfig,
  event: DestinationIdentifyEvent
) => {
  let payload = constructPayload(event, mapping.identify);

  if (!payload.$name && payload.$first_name && payload.$last_name) {
    payload.$name = `${payload.$first_name} ${payload.$last_name}`;
  }

  return payload;
};

/**
 * Transforms a page or screen event to a mixpanel event
 * @param config Mixpanel config
 * @param event Destination page or screen event
 * @returns Mixpanel event payload
 */
const transformPageOrScreenEvent = (
  config: MixpanelConfig,
  event: DestinationPageEvent | DestinationScreenEvent
) => {
  let properties = transformBaseEvent(config, event);

  if (event.name) {
    properties.name = event.name;
  }
  if (event.category) {
    properties.category = event.category;
  }

  if (event.type === 'page') {
    properties.current_page_title = event.properties?.title;

    if (event.properties?.url) {
      const url = new URL(event.properties?.url || '');

      properties.current_domain = url.hostname;
      properties.current_url_path = url.pathname;
      properties.current_url_protocol = url.protocol;
      properties.current_url_search = url.search;
    }
  } else if (event.type === 'screen') {
    properties.current_page_title = event.name;
  }

  return {
    event: '$mp_web_page_view',
    properties,
  };
};

/**
 * Transforms an alias event to a mixpanel alias creation payload.
 * Only used when identityMerge is set to 'original'
 * @param config Mixpanel config
 * @param event Destination alias event
 * @returns Mixpanel alias creation payload
 */
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

/**
 * Transforms destination events to mixpanel requests
 * @param config Mixpanel config
 * @param events Destination events
 * @returns Mixpanel requests
 */
const transformEvents = (
  config: MixpanelConfig,
  events: DestinationEvent[]
) => {
  const importRequests: Record<string, any>[] = [];
  const engageRequests: Record<string, any>[] = [];
  const groupRequests: Record<string, any>[] = [];

  events.forEach((event) => {
    const timestamp = new Date(event.originalTimestamp || event.timestamp);

    if (moment(timestamp).isBefore(moment().subtract(5, 'year'))) {
      console.log(
        `${DESTINATION_TYPE}: event ${event.messageId} is too old:`,
        timestamp,
        'Skipping...'
      );
      return;
    }

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
        $distinct_id:
          config.identityMerge === 'original'
            ? event.userId || event.anonymousId
            : event.userId || `$device:${event.anonymousId}`,
        $ip: event.context?.ip,
        $ignore_time: event.context?.active === false,
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
      // Engage request for user update
      engageRequests.push({
        id: event.messageId,
        $token: config._secret_credentials.token,
        $distinct_id:
          config.identityMerge === 'original'
            ? event.userId || event.anonymousId
            : event.userId || `$device:${event.anonymousId}`,
        $ip: event.context?.ip,
        $set: {
          $group_id: event.groupId,
        },
      });

      // Group request for group creation
      groupRequests.push({
        id: event.messageId,
        $token: config._secret_credentials.token,
        $group_key: 'groupId',
        $group_id: event.groupId,
        $ip: event.context?.ip,
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
    config: GatewayConfig,
    events: DestinationEvent[],
    destinationType: DestinationType
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

    console.log(`${DESTINATION_TYPE}: sending ${events.length} event(s)`);

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
                  `${DESTINATION_TYPE}: error while sending event to Mixpanel:`,
                  response
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
                    `${DESTINATION_TYPE}: error while sending event to Mixpanel:`,
                    response
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
