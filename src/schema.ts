import slugify from "slugify";
import {
  DestinationEvent,
  DestinationGroupEvent,
  DestinationIdentifyEvent,
  DestinationPageEvent,
  DestinationScreenEvent,
  DestinationTrackEvent,
  EventType,
} from "./event";
import { flattenObject, mapKeys } from "./utils";

export type FieldType = "string" | "boolean" | "timestamp" | "json";

export interface Field {
  name: string;
  type: FieldType;
  path?: string;
  transform?: (
    e: DestinationEvent
  ) => string | number | boolean | Date | object | null;
}

export type Schema = {
  [key in EventType]: {
    fields: Field[];
  };
};

const base: Field[] = [
  {
    name: "id",
    type: "string",
    path: "messageId",
  },
  {
    name: "anonymous_id",
    type: "string",
    path: "anonymousId",
  },
  {
    name: "context_ip",
    type: "string",
    path: "context.ip",
  },
  {
    name: "context_library_name",
    type: "string",
    path: "context.library.name",
  },
  {
    name: "context_library_version",
    type: "string",
    path: "context.library.version",
  },
  {
    name: "context_locale",
    type: "string",
    path: "context.locale",
  },
  {
    name: "context_page_path",
    type: "string",
    path: "context.page.path",
  },
  {
    name: "context_page_referrer",
    type: "string",
    path: "context.page.referrer",
  },
  {
    name: "context_page_title",
    type: "string",
    path: "context.page.title",
  },
  {
    name: "context_page_url",
    type: "string",
    path: "context.page.url",
  },
  {
    name: "context_user_agent",
    type: "string",
    path: "context.userAgent",
  },
  {
    name: "context_user_agent_data_brands",
    type: "json",
    transform: (e) => {
      const { context } = e;
      return context.userAgentData
        ? context.userAgentData.brands.map((brand) => {
            return {
              brand: brand.brand,
              version: brand.version,
            };
          })
        : null;
    },
  },
  {
    name: "context_user_agent_data_mobile",
    type: "boolean",
    path: "context.userAgentData.mobile",
  },
  {
    name: "context_user_agent_data_platform",
    type: "string",
    path: "context.userAgentData.platform",
  },
  {
    name: "context_campaign_content",
    type: "string",
    path: "context.campaign.content",
  },
  {
    name: "context_campaign_medium",
    type: "string",
    path: "context.campaign.medium",
  },
  {
    name: "context_campaign_name",
    type: "string",
    path: "context.campaign.name",
  },
  {
    name: "context_campaign_source",
    type: "string",
    path: "context.campaign.source",
  },
  {
    name: "context_campaign_term",
    type: "string",
    path: "context.campaign.term",
  },
  {
    name: "original_timestamp",
    type: "timestamp",
    path: "timestamp",
  },
  {
    name: "timestamp",
    type: "timestamp",
    path: "timestamp",
  },
  {
    name: "received_at",
    type: "timestamp",
    transform: () => new Date(),
  },
  {
    name: "sent_at",
    type: "timestamp",
    path: "sentAt",
  },
  {
    name: "user_id",
    type: "string",
    path: "userId",
  },
];

export const schema: Schema = {
  alias: {
    fields: [
      ...base,
      {
        name: "previous_id",
        type: "string",
        path: "previousId",
      },
    ],
  },
  group: {
    fields: [
      ...base,
      {
        name: "group_id",
        type: "string",
        path: "groupId",
      },
      {
        name: "traits",
        type: "json",
        transform: (e) => {
          const { traits } = e as DestinationGroupEvent;
          const reservedTraitAlias = {
            createdAt: "created_at",
          };

          // flatten Object to key_nestedkey format
          // has keys like address_city, address_postalCode
          const flatTraits = flattenObject(traits);

          return mapKeys(reservedTraitAlias, flatTraits);
        },
      },
      {
        name: "extra_fields",
        type: "json",
        transform: (e) => {
          const { extraParams } = e as DestinationGroupEvent;
          return {
            context: {
              ...extraParams.context,
              campaign: {
                ...extraParams.campaign,
              },
            },
          };
        },
      },
    ],
  },
  identify: {
    fields: [
      ...base,
      {
        name: "traits",
        type: "json",
        transform: (e) => {
          const { traits } = e as DestinationIdentifyEvent;
          const reservedTraitAlias = {
            firstName: "first_name",
            lastName: "last_name",
            lastSeen: "last_seen",
            address_postalCode: "address_postal_code",
            createdAt: "created_at",
          };

          // flatten Object to key_nestedkey format
          // has keys like address_city, address_postalCode
          const flatTraits = flattenObject(traits);

          return mapKeys(reservedTraitAlias, flatTraits);
        },
      },
      {
        name: "extra_fields",
        type: "json",
        transform: (e) => {
          const { extraParams } = e as DestinationIdentifyEvent;
          return {
            context: {
              ...extraParams.context,
              campaign: {
                ...extraParams.campaign,
              },
            },
          };
        },
      },
    ],
  },
  page: {
    fields: [
      ...base,
      {
        name: "category",
        type: "string",
        path: "category",
      },
      {
        name: "name",
        type: "string",
        path: "context.page.name",
      },
      {
        name: "path",
        type: "string",
        path: "context.page.path",
      },
      {
        name: "title",
        type: "string",
        path: "context.page.title",
      },
      {
        name: "url",
        type: "string",
        path: "context.page.url",
      },
      {
        name: "referrer",
        type: "string",
        path: "context.page.referrer",
      },
      {
        name: "search",
        type: "string",
        path: "context.page.search",
      },
      {
        name: "extra_fields",
        type: "json",
        transform: (e) => {
          const { extraParams } = e as DestinationPageEvent;
          return {
            context: {
              ...extraParams.context,
              ...extraParams.properties,
              campaign: {
                ...extraParams.campaign,
              },
            },
          };
        },
      },
    ],
  },
  screen: {
    fields: [
      ...base,
      {
        name: "category",
        type: "string",
        path: "category",
      },
      {
        name: "name",
        type: "string",
        path: "context.page.name",
      },
      {
        name: "extra_fields",
        type: "json",
        transform: (e) => {
          const { extraParams } = e as DestinationScreenEvent;
          return {
            context: {
              ...extraParams.context,
              ...extraParams.properties,
              campaign: {
                ...extraParams.campaign,
              },
            },
          };
        },
      },
    ],
  },
  track: {
    fields: [
      ...base,
      {
        name: "event",
        type: "string",
        transform: (e) =>
          slugify((e as DestinationTrackEvent).event, {
            replacement: "_",
            lower: true,
          }),
      },
      {
        name: "event_text",
        type: "string",
        path: "event",
      },
      {
        name: "extra_fields",
        type: "json",
        transform: (e) => {
          const { extraParams } = e as DestinationTrackEvent;
          return {
            context: {
              ...extraParams.context,
              ...extraParams.properties,
              campaign: {
                ...extraParams.campaign,
              },
            },
          };
        },
      },
    ],
  },
};
