import {type ApolloSDK, type ApolloSDKTypes} from '@opensdks/sdk-apollo'
import {mapper, pick, zCast} from '@openint/vdk'
import type {SalesEngagementAdapter} from '../router'
import type {EmailAddress} from '../unifiedModels'
import * as unified from '../unifiedModels'

type Apollo = ApolloSDKTypes['oas']['components']['schemas']

const mappers = {
  contact: mapper(zCast<Apollo['contact']>(), unified.contact, {
    id: (r) => r.id?.toString() ?? '',
    first_name: (r) => r.first_name ?? '',
    last_name: (r) => r.last_name ?? '',
    // TODO: owner_id is missing
    owner_id: () => '',
    // TODO: account_id is missing
    // account_id: (r) => r.account_id ?? undefined,
    job_title: (r) => r.title ?? '',
    // TODO: Need to confirm city, couontry, postal_code, state and street_address
    // address: (r) => ({
    //   city: r.city ?? '',
    //   country: r.country ?? '',
    //   postal_code: r.postal_code ?? '',
    //   state: r.state ?? '',
    //   street_1: r.street_address ?? '',
    //   street_2: ''
    // }),
    address: () => ({
      city: '',
      country: '',
      postal_code: '',
      state: '',
      street_1: '',
      street_2: '',
    }),
    email_addresses: (r) => {
      const emails: EmailAddress[] = []
      if (r.email) {
        emails.push({
          email_address: r.email,
          email_address_type: 'primary',
        })
      }
      return emails
    },
    // To implement
    phone_numbers: () => [],
    open_count: () => 0,
    click_count: () => 0,
    reply_count: () => 0,
    bounced_count: () => 0,
    // To implement
    // created_at: (r) => r.crated_at ?? new Date().toISOString(),
    created_at: (r) => r.updated_at ?? new Date().toDateString(),
    updated_at: (r) => r.updated_at ?? new Date().toISOString(),
    is_deleted: () => false,
    last_modified_at: (r) => r.updated_at ?? new Date().toISOString(),
    raw_data: (r) => r,
  }),
  sequence: mapper(zCast<Apollo['emailer_campaign']>(), unified.sequence, {
    id: (r) => r.id,
    name: (r) => r.name ?? '',
    created_at: (r) => r.created_at ?? new Date().toISOString(),
    updated_at: () => new Date().toISOString(),
    is_deleted: (r) => r.archived,
    last_modified_at: () => new Date().toISOString(),
    owner_id: (r) => r.user_id ?? '',
    tags: (r) => r.label_ids,
    num_steps: (r) => r.num_steps ?? 0,
    metrics: (r) =>
      pick(r, [
        'unique_scheduled',
        'unique_delivered',
        'unique_bounced',
        'unique_opened',
        'unique_replied',
        'unique_demoed',
        'unique_clicked',
        'unique_unsubscribed',
        'bounce_rate',
        'open_rate',
        'click_rate',
        'reply_rate',
        'spam_blocked_rate',
        'opt_out_rate',
        'demo_rate',
      ]),
    is_enabled: (r) => r.active ?? false,
    raw_data: (r) => r,
  }),
}

export const apolloAdapter = {
  listContacts: async ({instance}) => {
    const res = await instance.POST('/v1/contacts/search', {})
    return {
      has_next_page: true,
      items: res.data.contacts.map(mappers.contact),
    }
  },
  // eslint-disable-next-line @typescript-eslint/require-await, arrow-body-style
  listSequences: async () => {
    return {
      next_page_cursor: null,
      items: [],
    }
  },
} satisfies SalesEngagementAdapter<ApolloSDK>
