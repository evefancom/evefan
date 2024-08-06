import UAParser from 'ua-parser-js';
import { removeKeysFromObject } from './utils';
import { Context } from 'hono';
import { v4 as uuid4 } from 'uuid';

export interface UserAgent {
  browser_family?: string;
  browser_version?: string;
  os_family?: string;
  os_version?: string;
  device_family?: string;
  device_brand?: string;
  device_model?: string;
  bot?: boolean;
}

export interface Location {
  country: string;
  region: string;
  city: string;
  latitude: number;
  longitude: number;
}

export interface CampaignParams {
  source: string;
  medium: string;
  term: string;
  content: string;
  name: string;
  [key: string]: string;
}

export type EventType =
  | 'track'
  | 'identify'
  | 'page'
  | 'screen'
  | 'group'
  | 'alias';

interface EventBase {
  timestamp: string;
  integrations: Record<string, unknown>;
  anonymousId: string;
  type: EventType;
  properties?: {
    [key: string]: string | undefined;
  };
  traits?: {
    [key: string]: string | number | boolean | object | undefined;
  };
  category?: string;
  //screen resolution is missing
  context: {
    active?: boolean;
    app?: {
      name: string;
      version: string;
      build: string;
    };
    campaign?: {
      source: string;
      medium: string;
      term: string;
      content: string;
      name: string;
      //extra
      [key: string]: string;
    };
    device?: {
      id: string;
      advertisingId: string;
      manufacturer: string;
      model: string;
      name: string;
      type: string;
      version: string;
      token?: string;
    };
    ip?: string;
    library: {
      name: string;
      version: string;
    };
    locale?: string;
    network?: {
      ip: string;
      city: string;
      country: string;
      region: string;
    };
    page?: {
      bluetooth?: string;
      carrier?: string;
      cellular?: string;
      wifi?: string;
    };
    os?: {
      name: string;
      version: string;
    };
    screen?: {
      density: string;
      height: number;
      width: number;
    };
    timezone?: string;
    traits?: {
      [key: string]: string | number | boolean | object | undefined;
    };
    userAgent: string;
    userAgentData: {
      brands: Array<{
        brand: string;
        version: string;
      }>;
      mobile: boolean;
      platform: string;
    };
  };
  messageId: string;
  writeKey: string;
  userId: string | null;
  sentAt: string;
  _metadata: {
    bundled: Array<string>;
    unbundled: Array<string>;
    bundledIds: Array<string>;
  };
  originalTimestamp?: string;
}

export interface PageEvent extends EventBase {
  type: 'page';
  properties: {
    path: string;
    referrer: string;
    search: string;
    title: string;
    url: string;
    [key: string]: string;
  };
  name?: string;
  category?: string;
}

export interface ScreenEvent extends EventBase {
  type: 'screen';
  properties: {
    [key: string]: string;
  };
  name?: string;
  category?: string;
}

export interface TrackEvent extends EventBase {
  type: 'track';
  event: string;
  properties: {
    revenue?: string;
    currency?: string;
    value?: string;
    [key: string]: string | undefined;
  };
}

export interface IdentifyEvent extends EventBase {
  type: 'identify';
  traits: {
    /**
     * Full name of a user. If you only pass a first and last name
     * Segment automatically fills in the full name for you.
     */
    name?: string;
    /**
     * Email address of a user.
     */
    email?: string;
    /**
     * Plan that a user is on.
     */
    plan?: string;
    /**
     * URL to an avatar image for the user.
     */
    avatar?: string;
    /**
     * Date the user’s account was first created. Segment recommends using ISO-8601 date strings.
     */
    birthday?: string;
    /**
     * Company the user represents, optionally containing: name, id, industry, employee_count or plan
     */
    company?: {
      name?: string;
      id?: string;
      industry?: string;
      employee_count?: number;
      plan?: string;
    };
    /**
     * Age of a user.
     */
    age?: number;
    /**
     * Number of logins of a user.
     */
    logins?: number;
    /**
     * First name of a user.
     */
    firstName?: string;
    /**
     * Gender of a user.
     */
    gender?: string;
    /**
     * Unique ID in your database for a user.
     */
    id?: string;
    /**
     * Last name of a user.
     */
    lastName?: string;
    /**
     * Phone number of a user.
     */
    phone?: string;
    /**
     * Title of a user, usually related to their position at a specific company. Example: “VP of Engineering”
     */
    title?: string;
    /**
     * User’s username. This should be unique to each user, like the usernames of Twitter or GitHub.
     */
    username?: string;
    /**
     * Website of a user.
     */
    website?: string;
    /**
     * Street address of a user. This should be a dictionary containing
     * optional city, country, postalCode, state, or street.
     */
    address?: {
      street?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    };
    /**
     * Date the user’s account was first created. Segment recommends using ISO-8601 date strings.
     */
    createdAt?: string;
    /**
     * Description of the user.
     */
    description?: string;
    /**
     * Extra traits
     */
    [key: string]: string | number | boolean | undefined | object;
  };
}

export interface GroupEvent extends EventBase {
  type: 'group';
  groupId: string;
  traits: {
    /**
     * Street address of a group. This should be a dictionary containing
     * optional city, country, postalCode, state, or street.
     */
    address?: {
      street?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    };
    /**
     * URL to an avatar image for the group.
     */
    avatar?: string;
    /**
     * Date the group’s account was first created. Segment recommends ISO-8601 date strings.
     */
    createdAt?: string;
    /**
     * Description of the group, like their personal bio.
     */
    description?: string;
    /**
     * Email address of group.
     */
    email?: string;
    /**
     * Number of employees of a group, typically used for companies.
     */
    employees?: string;
    /**
     * Unique ID in your database for a group.
     */
    id?: string;
    /**
     * Industry a user works in, or a group is part of.
     */
    industry?: string;
    /**
     * Name of a group.
     */
    name?: string;
    /**
     * Phone number of a group.
     */
    phone?: string;
    /**
     * Website of a group.
     */
    website?: string;
    /**
     * Plan that a group is in.
     */
    plan?: string;
    /**
     * Extra traits
     */
    [key: string]: string | number | boolean | undefined | object;
  };
}

export interface AliasEvent extends EventBase {
  type: 'alias';
  previousId: string;
}

export type Event =
  | PageEvent
  | ScreenEvent
  | TrackEvent
  | IdentifyEvent
  | GroupEvent
  | AliasEvent;

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

interface DestinationEventBase {
  location: Location;
  useragent: UserAgent;
  extraParams: {
    properties: Record<string, any>;
    context: Record<string, any>;
    campaign: Record<string, any>;
  };
}

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

export const getUserAgentFromUAString = (uaString: string): UserAgent => {
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
    browser_family: uaParsed.browser.name,
    browser_version: uaParsed.browser.version,
    os_family: uaParsed.os.name,
    os_version: uaParsed.os.version,
    device_family: uaParsed.device.model,
    device_brand: uaParsed.device.vendor,
    device_model: uaParsed.device.model,
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
    // @ts-ignore
    country: country ?? '',
    // @ts-ignore
    region: region ?? '',
    // @ts-ignore
    city: city ?? '',
    latitude: latitude !== undefined ? parseFloat(latitude + '') : -1,
    longitude: longitude !== undefined ? parseFloat(longitude + '') : -1,
  };
};

export const getEventExtraParams = (event: Event, type: EventType) => {
  var extraProperties = {};
  var extraTraits = {};

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

  const eventContextExtra = removeKeysFromObject(
    event.context,
    ReservedContextKeys
  );

  const eventCampaignExtra = removeKeysFromObject(
    event.context.campaign || {},
    ReservedCampaignKeys
  );

  //empty objects, should it be something else ?
  return {
    properties: extraProperties,
    traits: extraTraits,
    context: eventContextExtra,
    campaign: eventCampaignExtra,
  };
};

export function formatEvent(
  event: Event,
  context: Context,
  type: EventType
): DestinationEvent {
  const destinationEvent: DestinationEvent = {
    ...event,
    messageId: event.messageId || uuid4(),
    extraParams: getEventExtraParams(event, type),
    location: getLocationFromCFData(context.req.raw.cf),
    useragent: getUserAgentFromUAString(event.context.userAgent),
  };

  return destinationEvent;
}
