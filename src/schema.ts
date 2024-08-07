import { z } from 'zod';

/**
 * Zod schema for EventType.
 * This schema defines the allowed event types.
 */
export const EventTypeSchema = z.enum([
  'track',
  'identify',
  'page',
  'screen',
  'group',
  'alias',
]);

export type EventType = z.infer<typeof EventTypeSchema>;

/**
 * Zod schema for the base event structure.
 * This schema defines common fields shared across different event types.
 */
const EventBaseSchema = z.object({
  /** Metadata for bundled events */
  _metadata: z
    .object({
      /** Array of bundled event names */
      bundled: z.array(z.string()),
      /** Array of bundled event IDs */
      bundledIds: z.array(z.string()),
      /** Array of unbundled event names */
      unbundled: z.array(z.string()),
    })
    .optional(),
  /** Anonymous identifier for the user */
  anonymousId: z.string().optional(),
  /** Category of the event */
  category: z.string().optional(),
  /** Contextual information about the event */
  context: z
    .object({
      /** Whether the user is currently active */
      active: z.boolean().optional(),
      /** Application information */
      app: z
        .object({
          build: z.string(),
          name: z.string(),
          version: z.string(),
        })
        .optional(),
      /** Campaign information */
      campaign: z.record(z.string()).optional(),
      /** Device information */
      device: z
        .object({
          advertisingId: z.string(),
          id: z.string(),
          manufacturer: z.string(),
          model: z.string(),
          name: z.string(),
          token: z.string().optional(),
          type: z.string(),
          version: z.string(),
        })
        .optional(),
      /** IP address of the user */
      ip: z.string().optional(),
      /** Library information */
      library: z
        .object({
          name: z.string(),
          version: z.string(),
        })
        .optional(),
      /** User's locale */
      locale: z.string().optional(),
      /** Network information */
      network: z
        .object({
          city: z.string(),
          country: z.string(),
          ip: z.string(),
          region: z.string(),
        })
        .optional(),
      /** Operating system information */
      os: z
        .object({
          name: z.string(),
          version: z.string(),
        })
        .optional(),
      /** Page information */
      page: z
        .object({
          bluetooth: z.string().optional(),
          carrier: z.string().optional(),
          cellular: z.string().optional(),
          wifi: z.string().optional(),
        })
        .optional(),
      /** Screen information */
      screen: z
        .object({
          density: z.string(),
          height: z.number(),
          width: z.number(),
        })
        .optional(),
      /** User's timezone */
      timezone: z.string().optional(),
      /** User traits */
      traits: z
        .record(
          z.union([
            z.string(),
            z.number(),
            z.boolean(),
            z.array(z.any()),
            z.object({}),
          ])
        )
        .optional(),
      /** User agent string */
      userAgent: z.string().optional(),
      /** User agent data */
      userAgentData: z
        .object({
          brands: z.array(
            z.object({
              brand: z.string(),
              version: z.string(),
            })
          ),
          mobile: z.boolean(),
          platform: z.string(),
        })
        .optional(),
    })
    .optional(),
  /** Integration-specific options */
  integrations: z.record(z.any()).optional(),
  /** Unique identifier for the message */
  messageId: z.string(),
  /** Original timestamp of the event */
  originalTimestamp: z.string().optional(),
  /** Additional properties of the event */
  properties: z
    .record(
      z.string(),
      z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.array(z.any()),
        z.object({}),
      ])
    )
    .optional(),
  /** Timestamp when the event was sent */
  sentAt: z.string(),
  /** Timestamp of the event */
  timestamp: z.string(),
  /** User traits */
  traits: z
    .record(
      z.string(),
      z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.array(z.any()),
        z.object({}),
      ])
    )
    .optional(),
  /** Type of the event */
  type: EventTypeSchema,
  /** User identifier */
  userId: z.string().nullable().optional(),
  /** Write key for the event */
  writeKey: z.string().optional(),
});

/**
 * Zod schema for track events.
 * This schema extends the EventBaseSchema and adds specific fields for tracking user actions.
 */
const TrackEventSchema = EventBaseSchema.extend({
  /** Event type, always 'track' for TrackEvent */
  type: z.literal('track'),
  /** The name of the event being tracked */
  event: z.string(),
});

export type TrackEvent = z.infer<typeof TrackEventSchema>;

/**
 * Zod schema for the IdentifyEvent interface.
 * This schema extends the EventBaseSchema and adds specific fields for user identification.
 */
const IdentifyEventSchema = EventBaseSchema.extend({
  /** Event type, always 'identify' for IdentifyEvent */
  type: z.literal('identify'),
  /** User traits object containing various user attributes */
  traits: z
    .object({
      /** User's address information */
      address: z
        .object({
          city: z.string().optional(),
          country: z.string().optional(),
          postalCode: z.string().optional(),
          state: z.string().optional(),
          street: z.string().optional(),
        })
        .optional(),
      /** User's age */
      age: z.number().optional(),
      /** URL to the user's avatar image */
      avatar: z.string().optional(),
      /** User's birthday in ISO 8601 date format */
      birthday: z.string().optional(),
      /** User's company information */
      company: z
        .object({
          employee_count: z.number().optional(),
          id: z.string().optional(),
          industry: z.string().optional(),
          name: z.string().optional(),
          plan: z.string().optional(),
        })
        .optional(),
      /** Timestamp of when the user was created */
      createdAt: z.string().optional(),
      /** Description of the user */
      description: z.string().optional(),
      /** User's email address */
      email: z.string().optional(),
      /** User's first name */
      firstName: z.string().optional(),
      /** User's gender */
      gender: z.string().optional(),
      /** Unique identifier for the user */
      id: z.string().optional(),
      /** User's last name */
      lastName: z.string().optional(),
      /** Number of times the user has logged in */
      logins: z.number().optional(),
      /** User's full name */
      name: z.string().optional(),
      /** User's phone number */
      phone: z.string().optional(),
      /** User's subscription plan */
      plan: z.string().optional(),
      /** User's job title */
      title: z.string().optional(),
      /** User's username */
      username: z.string().optional(),
      /** User's website URL */
      website: z.string().optional(),
    })
    .and(
      z.record(
        z.string(),
        z.union([
          z.string(),
          z.number(),
          z.boolean(),
          z.array(z.any()),
          z.object({}),
        ])
      )
    )
    .optional(),
});

export type IdentifyEvent = z.infer<typeof IdentifyEventSchema>;

/**
 * Zod schema for page events.
 * This schema extends the EventBaseSchema and adds specific fields for tracking page views.
 */
const PageEventSchema = EventBaseSchema.extend({
  /** Event type, always 'page' for PageEvent */
  type: z.literal('page'),
  /** Properties specific to the page event */
  properties: z
    .object({
      /** The path of the page */
      path: z.string(),
      /** The referrer of the page */
      referrer: z.string(),
      /** The search query parameters */
      search: z.string(),
      /** The title of the page */
      title: z.string(),
      /** The full URL of the page */
      url: z.string(),
    })
    .and(
      z
        .record(
          z.string(),
          z.union([
            z.string(),
            z.number(),
            z.boolean(),
            z.array(z.any()),
            z.object({}),
          ])
        )
        .optional()
    )
    .optional(),
  /** Optional name of the page */
  name: z.string().optional(),
  /** Optional category of the page */
  category: z.string().optional(),
});

export type PageEvent = z.infer<typeof PageEventSchema>;

/**
 * Zod schema for screen events.
 * This schema extends the EventBaseSchema and adds specific fields for tracking screen views in mobile apps.
 */
const ScreenEventSchema = EventBaseSchema.extend({
  /** Event type, always 'screen' for ScreenEvent */
  type: z.literal('screen'),
  /** Optional name of the screen */
  name: z.string().optional(),
  /** Optional category of the screen */
  category: z.string().optional(),
});

export type ScreenEvent = z.infer<typeof ScreenEventSchema>;

/**
 * Zod schema for group events.
 * This schema extends the EventBaseSchema and adds specific fields for tracking group-related events.
 */
const GroupEventSchema = EventBaseSchema.extend({
  /** Event type, always 'group' for GroupEvent */
  type: z.literal('group'),
  /** Unique identifier for the group */
  groupId: z.string(),
  /** Optional traits specific to the group */
  traits: z
    .object({
      /** Name of the group */
      name: z.string().optional(),
      /** Industry the group belongs to */
      industry: z.string().optional(),
      /** Number of employees in the group */
      employees: z.number().optional(),
      /** Plan the group is subscribed to */
      plan: z.string().optional(),
      /** Website of the group */
      website: z.string().optional(),
      /** Description of the group */
      description: z.string().optional(),
      /** Email address associated with the group */
      email: z.string().email().optional(),
      /** Phone number of the group */
      phone: z.string().optional(),
      /** Address of the group */
      address: z.string().optional(),
      /** Avatar or logo URL of the group */
      avatar: z.string().url().optional(),
      /** Date when the group was created */
      createdAt: z.string().optional(),
    })
    .and(
      z.record(
        z.string(),
        z.union([
          z.string(),
          z.number(),
          z.boolean(),
          z.array(z.any()),
          z.object({}),
        ])
      )
    )
    .optional(),
});

export type GroupEvent = z.infer<typeof GroupEventSchema>;

/**
 * Zod schema for alias events.
 * This schema extends the EventBaseSchema and adds specific fields for alias events.
 */
const AliasEventSchema = EventBaseSchema.extend({
  /** Event type, always 'alias' for AliasEvent */
  type: z.literal('alias'),
  /** The previous identifier that the user was recognized by */
  previousId: z.string(),
  /** The new identifier that the user should be recognized by going forward */
  userId: z.string(),
});

export type AliasEvent = z.infer<typeof AliasEventSchema>;

/**
 * Zod schema for the Event type.
 * This schema represents a union of all possible event types.
 */
export const EventSchema = z.intersection(
  z.discriminatedUnion('type', [
    TrackEventSchema,
    PageEventSchema,
    ScreenEventSchema,
    IdentifyEventSchema,
    GroupEventSchema,
    AliasEventSchema,
  ]),
  z.record(
    z.string(),
    z.union([
      z.string(),
      z.number(),
      z.boolean(),
      z.array(z.any()),
      z.object({}),
    ])
  )
);

export type Event = z.infer<typeof EventSchema>;
