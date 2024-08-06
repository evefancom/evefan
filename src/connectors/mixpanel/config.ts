export interface Mapping {
  sourceKeys: string | string[];
  destKey: string;
  required?: boolean;
}

export interface MappingSchema {
  event: Mapping[];
  identify: Mapping[];
  profile: {
    android: Mapping[];
    ios: Mapping[];
  };
}

export const mapping: MappingSchema = {
  event: [
    {
      sourceKeys: ['context.ip', 'request_ip'],
      destKey: 'ip',
    },
    {
      sourceKeys: 'context.campaign.name',
      destKey: 'campaign_id',
    },
    {
      sourceKeys: 'userId',
      destKey: '$user_id',
    },
    {
      sourceKeys: 'context.page.url',
      destKey: '$current_url',
    },
    {
      sourceKeys: 'context.os.name',
      destKey: '$os',
    },
    {
      sourceKeys: 'context.page.referrer',
      destKey: '$referrer',
    },
    {
      sourceKeys: 'context.screen.height',
      destKey: '$screen_height',
    },
    {
      sourceKeys: 'context.screen.width',
      destKey: '$screen_width',
    },
    {
      sourceKeys: 'context.screen.density',
      destKey: '$screen_dpi',
    },
    {
      sourceKeys: 'context.network.carrier',
      destKey: '$carrier',
    },
    {
      sourceKeys: 'context.os.version',
      destKey: '$os_version',
    },
    {
      sourceKeys: 'context.device.name',
      destKey: '$device',
    },
    {
      sourceKeys: 'context.device.manufacturer',
      destKey: '$manufacturer',
    },
    {
      sourceKeys: 'context.device.model',
      destKey: '$model',
    },
    {
      sourceKeys: 'context.device.model',
      destKey: 'mp_device_model',
    },
    {
      sourceKeys: 'context.network.wifi',
      destKey: '$wifi',
    },
    {
      sourceKeys: 'context.network.bluetooth',
      destKey: '$bluetooth_enabled',
    },
    {
      sourceKeys: 'properties.bluetoothVersion',
      destKey: '$bluetooth_version',
    },
    {
      sourceKeys: 'context.library.name',
      destKey: 'mp_lib',
    },
    {
      sourceKeys: 'context.page.initialReferrer',
      destKey: '$initial_referrer',
    },
    {
      sourceKeys: 'context.page.initialReferringDomain',
      destKey: '$initial_referring_domain',
    },
    {
      sourceKeys: 'properties.mpProcessingTimeMs',
      destKey: 'mp_processing_time_ms',
    },
    {
      sourceKeys: ['properties.appBuildNumber', 'context.app.build'],
      destKey: '$app_build_number',
    },
    {
      sourceKeys: ['properties.appVersionString', 'context.app.version'],
      destKey: '$app_version_string',
    },
    {
      sourceKeys: ['properties.brand', 'device.manufacturer'],
      destKey: '$brand',
    },
    {
      sourceKeys: 'properties.radio',
      destKey: '$radio',
    },
    {
      sourceKeys: 'properties.libVersion',
      destKey: '$lib_version',
    },
    {
      sourceKeys: 'properties.searchEngine',
      destKey: '$search_engine',
    },
    {
      sourceKeys: 'properties.mpKeyword',
      destKey: 'mp_keyword',
    },
    {
      sourceKeys: 'properties.hasNfc',
      destKey: '$has_nfc',
    },
    {
      sourceKeys: 'properties.hasTelephone',
      destKey: '$has_telephone',
    },
    {
      sourceKeys: 'properties.googlePlayServices',
      destKey: '$google_play_services',
    },
    {
      sourceKeys: 'messageId',
      destKey: '$insert_id',
    },
    {
      sourceKeys: ['session_id', 'context.sessionId'],
      destKey: '$session_id',
      required: false,
    },
  ],
  identify: [
    {
      destKey: '$created',
      sourceKeys: ['traits.createdAt', 'context.traits.createdAt'],
      required: false,
    },
    {
      destKey: '$email',
      sourceKeys: ['traits.email', 'context.traits.email', 'properties.email'],
      required: false,
    },
    {
      destKey: '$first_name',
      sourceKeys: [
        'traits.firstName',
        'traits.firstname',
        'traits.first_name',
        'context.traits.firstName',
        'context.traits.firstname',
        'context.traits.first_name',
      ],
      required: false,
    },
    {
      destKey: '$last_name',
      sourceKeys: [
        'traits.lastName',
        'traits.lastname',
        'traits.last_name',
        'context.traits.lastName',
        'context.traits.lastname',
        'context.traits.last_name',
      ],
      required: false,
    },
    {
      destKey: '$name',
      sourceKeys: ['traits.name', 'context.traits.name'],
      required: false,
    },
    {
      destKey: '$username',
      sourceKeys: [
        'traits.username',
        'context.traits.username',
        'traits.userName',
        'context.traits.userName',
      ],
      required: false,
    },
    {
      destKey: '$phone',
      sourceKeys: ['traits.phone', 'context.traits.phone', 'properties.phone'],
      required: false,
    },
    {
      destKey: '$avatar',
      sourceKeys: ['traits.avatar', 'context.traits.avatar'],
      required: false,
    },
    {
      destKey: '$country_code',
      sourceKeys: [
        'traits.address.country',
        'context.traits.address.country',
        'traits.country',
        'context.traits.country',
        'context.location.country',
      ],
      required: false,
    },
    {
      destKey: '$city',
      sourceKeys: [
        'traits.city',
        'context.traits.city',
        'traits.address.city',
        'context.traits.address.city',
        'context.location.city',
      ],
      required: false,
    },
    {
      destKey: '$region',
      sourceKeys: [
        'traits.state',
        'context.traits.state',
        'traits.address.state',
        'context.traits.address.state',
        'context.location.region',
      ],
      required: false,
    },
    {
      destKey: '$geo_source',
      sourceKeys: 'context.location.geoSource',
      required: false,
    },
    {
      destKey: '$timezone',
      sourceKeys: 'context.location.timezone',
      required: false,
    },
    {
      destKey: '$latitude',
      sourceKeys: 'context.location.latitude',
      required: false,
    },
    {
      destKey: '$longitude',
      sourceKeys: 'context.location.longitude',
      required: false,
    },
    {
      destKey: '$carrier',
      sourceKeys: 'context.network.carrier',
      required: false,
    },
    {
      destKey: '$manufacturer',
      sourceKeys: 'context.device.manufacturer',
      required: false,
    },
    {
      destKey: '$model',
      sourceKeys: 'context.device.model',
      required: false,
    },
    {
      destKey: '$screen_height',
      sourceKeys: 'context.screen.height',
      required: false,
    },
    {
      destKey: '$screen_width',
      sourceKeys: 'context.screen.width',
      required: false,
    },
    {
      destKey: '$wifi',
      sourceKeys: 'context.network.wifi',
      required: false,
    },
    {
      destKey: '$unsubscribed',
      sourceKeys: [
        'traits.unsubscribed',
        'context.traits.unsubscribed',
        'properties.unsubscribed',
      ],
      required: false,
    },
    {
      destKey: '$initial_referrer',
      sourceKeys: [
        'context.page.initial_referrer',
        'context.page.initialReferrer',
      ],
      required: false,
    },
    {
      destKey: '$initial_referring_domain',
      sourceKeys: [
        'context.page.initial_referring_domain',
        'context.page.initialReferringDomain',
      ],
      required: false,
    },
  ],
  profile: {
    android: [
      {
        destKey: '$created',
        sourceKeys: ['traits.createdAt', 'context.traits.createdAt'],
        required: false,
      },
      {
        destKey: '$email',
        sourceKeys: [
          'traits.email',
          'context.traits.email',
          'properties.email',
        ],
        required: false,
      },
      {
        destKey: '$first_name',
        sourceKeys: [
          'traits.firstName',
          'traits.firstname',
          'traits.first_name',
          'context.traits.firstName',
          'context.traits.firstname',
          'context.traits.first_name',
        ],
        required: false,
      },
      {
        destKey: '$last_name',
        sourceKeys: [
          'traits.lastName',
          'traits.lastname',
          'traits.last_name',
          'context.traits.lastName',
          'context.traits.lastname',
          'context.traits.last_name',
        ],
        required: false,
      },
      {
        destKey: '$name',
        sourceKeys: ['traits.name', 'context.traits.name'],
        required: false,
      },
      {
        destKey: '$username',
        sourceKeys: [
          'traits.username',
          'context.traits.username',
          'traits.userName',
          'context.traits.userName',
        ],
        required: false,
      },
      {
        destKey: '$phone',
        sourceKeys: [
          'traits.phone',
          'context.traits.phone',
          'properties.phone',
        ],
        required: false,
      },
      {
        destKey: '$avatar',
        sourceKeys: ['traits.avatar', 'context.traits.avatar'],
        required: false,
      },
      {
        destKey: '$country_code',
        sourceKeys: [
          'traits.address.country',
          'context.traits.address.country',
          'traits.country',
          'context.traits.country',
          'context.location.country',
        ],
        required: false,
      },
      {
        destKey: '$city',
        sourceKeys: [
          'traits.city',
          'context.traits.city',
          'traits.address.city',
          'context.traits.address.city',
          'context.location.city',
        ],
        required: false,
      },
      {
        destKey: '$region',
        sourceKeys: [
          'traits.state',
          'context.traits.state',
          'traits.address.state',
          'context.traits.address.state',
          'context.location.region',
        ],
        required: false,
      },
      {
        destKey: '$geo_source',
        sourceKeys: 'context.location.geoSource',
        required: false,
      },
      {
        destKey: '$timezone',
        sourceKeys: 'context.location.timezone',
        required: false,
      },
      {
        destKey: '$latitude',
        sourceKeys: 'context.location.latitude',
        required: false,
      },
      {
        destKey: '$longitude',
        sourceKeys: 'context.location.longitude',
        required: false,
      },
      {
        destKey: '$carrier',
        sourceKeys: 'context.network.carrier',
        required: false,
      },
      {
        destKey: '$manufacturer',
        sourceKeys: 'context.device.manufacturer',
        required: false,
      },
      {
        destKey: '$model',
        sourceKeys: 'context.device.model',
        required: false,
      },
      {
        destKey: '$screen_height',
        sourceKeys: 'context.screen.height',
        required: false,
      },
      {
        destKey: '$screen_width',
        sourceKeys: 'context.screen.width',
        required: false,
      },
      {
        destKey: '$wifi',
        sourceKeys: 'context.network.wifi',
        required: false,
      },
      {
        destKey: '$unsubscribed',
        sourceKeys: [
          'traits.unsubscribed',
          'context.traits.unsubscribed',
          'properties.unsubscribed',
        ],
        required: false,
      },
      {
        destKey: '$initial_referrer',
        sourceKeys: [
          'context.page.initial_referrer',
          'context.page.initialReferrer',
        ],
        required: false,
      },
      {
        destKey: '$initial_referring_domain',
        sourceKeys: [
          'context.page.initial_referring_domain',
          'context.page.initialReferringDomain',
        ],
        required: false,
      },
    ],
    ios: [
      {
        sourceKeys: 'context.os.name',
        destKey: '$os',
      },
      {
        sourceKeys: 'context.device.model',
        destKey: '$ios_device_model',
      },
      {
        sourceKeys: 'context.os.version',
        destKey: '$ios_version',
      },
      {
        sourceKeys: 'context.app.build',
        destKey: '$ios_app_release',
      },
      {
        sourceKeys: 'context.app.version',
        destKey: '$ios_app_version',
      },
      {
        sourceKeys: 'properties.iosLibVersion',
        destKey: '$ios_lib_version',
      },
    ],
  },
};
