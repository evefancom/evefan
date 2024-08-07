import UAParser from 'ua-parser-js';
import { removeKeysFromObject } from './utils';
import { Context } from 'hono';
import { v4 as uuid4 } from 'uuid';
import {
  AliasEvent,
  EventType,
  GroupEvent,
  IdentifyEvent,
  PageEvent,
  ScreenEvent,
  TrackEvent,
  Event,
  EventSchema,
} from './schema';

/**
 * Represents user agent information parsed from the User-Agent string.
 */
export type UserAgent = {
  /** Browser family (e.g., Chrome, Firefox) */
  browserFamily?: string;
  /** Browser version */
  browserVersion?: string;
  /** Operating system family (e.g., Windows, macOS) */
  osFamily?: string;
  /** Operating system version */
  osVersion?: string;
  /** Device family (e.g., iPhone, Samsung) */
  deviceFamily?: string;
  /** Device brand */
  deviceBrand?: string;
  /** Device model */
  deviceModel?: string;
  /** Indicates if the user agent is a bot */
  bot?: boolean;
};

/**
 * Represents location information.
 */
export type Location = {
  /** Country of the location */
  country: string;
  /** Region or state of the location */
  region: string;
  /** City of the location */
  city: string;
  /** Latitude coordinate */
  latitude: number;
  /** Longitude coordinate */
  longitude: number;
};

/**
 * Represents the parameters of a marketing campaign.
 */
export interface CampaignParams {
  /** The source of the campaign (e.g., google, newsletter) */
  source: string;
  /** The medium of the campaign (e.g., cpc, banner, email) */
  medium: string;
  /** The terms or keywords associated with the campaign */
  term: string;
  /** The content identifier of the ad or content */
  content: string;
  /** The name of the campaign */
  name: string;
  /** Additional custom parameters for the campaign */
  [key: string]: string;
}

export const ReservedPageEventKeys = [
  'timestamp',
  'category',
  'integrations',
  'userId',
  'anonymousId',
  'type',
  'properties',
  'context',
  'messageId',
  'writeKey',
  'sentAt',
  '_metadata',
];

export const ReservedPropertyKeys = {
  page: ['path', 'referrer', 'search', 'title', 'url'],
  track: ['revenue', 'currency', 'value'],
};

export const ReservedContextKeys = [
  'page',
  'userAgentData',
  'userAgent',
  'locale',
  'library',
  'campaign',
];

export const ReservedUserTraitKeys = [
  'name',
  'email',
  'plan',
  'avatar',
  'birthday',
  'company',
  'age',
  'logins',
  'firstName',
  'gender',
  'id',
  'lastName',
  'phone',
  'title',
  'username',
  'website',
  'address',
  'createdAt',
  'description',
];

export const ReservedGroupTraitKeys = [
  'address',
  'avatar',
  'createdAt',
  'description',
  'email',
  'employees',
  'id',
  'industry',
  'name',
  'phone',
  'website',
  'plan',
];

export const ReservedCampaignKeys = [
  'source',
  'medium',
  'term',
  'content',
  'name',
];

type DestinationEventBase = {
  messageId: string;
  type: EventType;
  timestamp: string;
  location: Location;
  userAgent: UserAgent;
  extraParams: {
    properties: Record<string, any>;
    context: Record<string, any>;
    campaign: Record<string, any>;
  };
};

export type DestinationPageEvent = PageEvent & DestinationEventBase;

export type DestinationScreenEvent = ScreenEvent & DestinationEventBase;

export type DestinationTrackEvent = TrackEvent & DestinationEventBase;

export type DestinationIdentifyEvent = IdentifyEvent & DestinationEventBase;

export type DestinationGroupEvent = GroupEvent & DestinationEventBase;

export type DestinationAliasEvent = AliasEvent & DestinationEventBase;

export type DestinationEvent =
  | DestinationPageEvent
  | DestinationScreenEvent
  | DestinationTrackEvent
  | DestinationIdentifyEvent
  | DestinationGroupEvent
  | DestinationAliasEvent;

export type DestinationEventType = EventType;

export const getUserAgentFromUAString = (uaString?: string): UserAgent => {
  /**
   * {
   * ua: '',
   * browser: {name: "Chrome", version: "114.0.0.0", major: "114"},
   * cpu: {architecture: undefined},
   * device: {vendor: "Apple", model: "Macintosh", type: undefined},
   * engine: { name: "Blink", version: "114.0.0.0" },
   * os: {name: "Mac OS", version: "10.15.7"}
   * }
   * */

  const uaParsed = new UAParser(uaString).getResult();
  return {
    browserFamily: uaParsed.browser.name,
    browserVersion: uaParsed.browser.version,
    osFamily: uaParsed.os.name,
    osVersion: uaParsed.os.version,
    deviceFamily: uaParsed.device.model,
    deviceBrand: uaParsed.device.vendor,
    deviceModel: uaParsed.device.model,
    bot: false,
  };
};

export const getLocationFromCFData = (
  context: CfProperties<unknown> = {}
): Location => {
  const {
    // asn, //ASN of the incoming request, e.g. 395747.
    // colo, //3-letter IATA airport code data center hit
    country, //Country of incoming request
    city, //City of incoming request -- where available
    latitude, //Latitude of incoming request -- where available
    longitude, //Longitude of incoming request -- where available
    // postalCode, //Postal Code of incoming request -- where available
    region, //region/state of incoming request
    // timezone, //Timezone of the incoming request, e.g. "America/Chicago".
  } = context;

  return {
    country: (country as string) ?? '',
    region: (region as string) ?? '',
    city: (city as string) ?? '',
    latitude: latitude !== undefined ? parseFloat(latitude + '') : -1,
    longitude: longitude !== undefined ? parseFloat(longitude + '') : -1,
  };
};

export const getEventExtraParams = (event: Event, type: EventType) => {
  var extraProperties = {};
  var extraTraits = {};
  var eventContextExtra = {};
  var eventCampaignExtra = {};

  if (type === 'page' && event.properties) {
    extraProperties = removeKeysFromObject(
      event.properties,
      ReservedPropertyKeys.page
    );
  } else if (type === 'screen' && event.properties) {
    extraProperties = event.properties;
  } else if (type === 'track' && event.properties) {
    extraProperties = removeKeysFromObject(
      event.properties,
      ReservedPropertyKeys.track
    );
  } else if (type === 'identify' && event.traits) {
    extraTraits = removeKeysFromObject(event.traits, ReservedUserTraitKeys);
  } else if (type === 'group' && event.traits) {
    extraTraits = removeKeysFromObject(event.traits, ReservedGroupTraitKeys);
  }

  if (event.context) {
    eventContextExtra = removeKeysFromObject(
      event.context,
      ReservedContextKeys
    );
  }

  if (event.context?.campaign) {
    eventCampaignExtra = removeKeysFromObject(
      event.context.campaign,
      ReservedCampaignKeys
    );
  }

  //empty objects, should it be something else ?
  return {
    properties: extraProperties,
    traits: extraTraits,
    context: eventContextExtra,
    campaign: eventCampaignExtra,
  };
};

export function formatEvent(
  rawEvent: Record<string, any>,
  context: Context,
  type: EventType
) {
  const event = EventSchema.parse({
    ...rawEvent,
    type: rawEvent.type || type,
    messageId: rawEvent.messageId || uuid4(),
    sentAt: rawEvent.sentAt || new Date().toISOString(),
    timestamp: rawEvent.timestamp || new Date().toISOString(),
  });
  return {
    ...event,
    extraParams: getEventExtraParams(event, type),
    location: getLocationFromCFData(context.req.raw.cf),
    userAgent: getUserAgentFromUAString(event.context?.userAgent),
  } as DestinationEvent;
}
