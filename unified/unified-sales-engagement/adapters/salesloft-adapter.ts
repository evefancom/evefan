import {
  type SalesloftSDK,
  type SalesloftSDKTypes,
} from '@opensdks/sdk-salesloft'
import {mapper, z, zCast} from '@openint/vdk'
import type {SalesEngagementAdapter} from '../router'
import type {EmailAddress, PhoneNumber} from '../unifiedModels'
import * as unified from '../unifiedModels'

type Salesloft = SalesloftSDKTypes['oas']['components']['schemas']

const listResponse = z.object({
  data: z.array(z.unknown()),
  meta: z.object({
    count: z.number(),
    count_truncated: z.boolean(),
  }),
  links: z
    .object({
      // does first / previous exist?
      last: z.string().nullish(),
      next: z.string().nullish(),
    })
    .optional(),
})

const mappers = {
  contact: mapper(zCast<Salesloft['Person']>(), unified.contact, {
    id: (r) => r.id?.toString() ?? '',
    first_name: (r) => r.first_name ?? '',
    last_name: (r) => r.last_name ?? '',
    owner_id: (r) => r.owner?.id?.toString() ?? '',
    account_id: (r) => r.account?.id?.toString() ?? '',
    job_title: (r) => r.title ?? '',
    address: (r) => ({
      city: r.city ?? '',
      country: r.country ?? '',
      postal_code: '',
      state: r.state ?? '',
      street_1: '',
      street_2: '',
    }),
    email_addresses: (r) => {
      const emails: EmailAddress[] = []
      if (r.email_address) {
        emails.push({
          email_address: r.email_address,
          email_address_type: 'primary',
        })
      }
      if (r.personal_email_address) {
        emails.push({
          email_address: r.personal_email_address,
          email_address_type: 'personal',
        })
      }
      if (r.secondary_email_address) {
        emails.push({
          email_address: r.secondary_email_address,
          email_address_type: 'other',
        })
      }
      return emails
    },
    phone_numbers: (r) => {
      const phoneNumbers: PhoneNumber[] = []
      if (r.phone) {
        phoneNumbers.push({
          phone_number: r.phone,
          phone_number_type: 'primary',
        })
      }
      if (r.home_phone) {
        phoneNumbers.push({
          phone_number: r.home_phone,
          phone_number_type: 'home',
        })
      }
      if (r.mobile_phone) {
        phoneNumbers.push({
          phone_number: r.mobile_phone,
          phone_number_type: 'mobile',
        })
      }
      return phoneNumbers
    },
    open_count: (r) => r.counts?.emails_viewed ?? 0,
    click_count: (r) => r.counts?.emails_clicked ?? 0,
    reply_count: (r) => r.counts?.emails_replied_to ?? 0,
    bounced_count: (r) => r.counts?.emails_bounced ?? 0,
    created_at: (r) => r.created_at ?? new Date().toISOString(),
    updated_at: (r) => r.updated_at ?? new Date().toISOString(),
    is_deleted: () => false,
    last_modified_at: (r) => r.updated_at ?? new Date().toISOString(),
    raw_data: (r) => r,
  }),
  account: mapper(zCast<Salesloft['Account']>(), unified.account, {
    id: (r) => r.id?.toString() ?? '',
    name: (r) => r.name ?? '',
    created_at: (r) => r.created_at ?? new Date().toISOString(),
    updated_at: (r) => r.updated_at ?? new Date().toISOString(),
    is_deleted: () => false,
    last_modified_at: (r) => r.updated_at ?? new Date().toISOString(),
    owner_id: (r) => r.owner?.id?.toString() ?? '',
    domain: (r) => r.domain ?? '',
    raw_data: (r) => r,
  }),
  sequence: mapper(zCast<Salesloft['Cadence']>(), unified.sequence, {
    id: (r) => r.id?.toString() ?? '',
    name: (r) => r.name ?? '',
    created_at: (r) => r.created_at ?? new Date().toISOString(),
    updated_at: (r) => r.updated_at ?? new Date().toISOString(),
    is_deleted: () => false,
    last_modified_at: (r) => r.updated_at ?? new Date().toISOString(),
    owner_id: (r) => r.owner?.id?.toString() ?? '',
    tags: (r) => r.tags ?? [],
    // TODO: Needs to confirm num_steps with Tony
    num_steps: () => 0,
    metrics: (r) => r.counts ?? {},
    is_enabled: (r) => !r.draft,
    raw_data: (r) => r,
  }),
  sequenceState: mapper(
    zCast<Salesloft['CadenceMembership']>(),
    unified.sequenceState,
    {
      id: (r) => r.id?.toString() ?? '',
      state: (r) => r.current_state ?? '',
      created_at: (r) => r.created_at ?? new Date().toISOString(),
      updated_at: (r) => r.updated_at ?? new Date().toISOString(),
      is_deleted: () => false,
      last_modified_at: (r) => r.updated_at ?? new Date().toISOString(),
      sequence_id: (r) => r.cadence?.id?.toString() ?? '',
      contact_id: (r) => r.person?.id?.toString() ?? '',
      mailbox_id: () => '',
      user_id: (r) => r.user?.id?.toString() ?? '',
      raw_data: (r) => r,
    },
  ),
  user: mapper(zCast<Salesloft['User']>(), unified.user, {
    id: (r) => r.id?.toString() ?? '',
    first_name: (r) => r.first_name ?? '',
    last_name: (r) => r.last_name ?? '',
    email: (r) => r.email ?? '',
    created_at: (r) => r.created_at ?? new Date().toISOString(),
    updated_at: (r) => r.updated_at ?? new Date().toISOString(),
    is_deleted: () => false,
    last_modified_at: (r) => r.updated_at ?? new Date().toISOString(),
    raw_data: (r) => r,
  }),
}

export const salesloftAdapter = {
  listContacts: async ({instance, input}) => {
    const res = await instance.GET(
      input.cursor
        ? (input.cursor.replace(
            instance.clientOptions.baseUrl ?? '',
            '',
          ) as '/v2/people.json')
        : '/v2/people.json',
    )
    return {
      next_page_cursor: listResponse.parse(res.data).links?.next ?? undefined,
      items: res.data.data?.map(mappers.contact) ?? [],
    }
  },
  listSequences: async ({instance, input}) => {
    const res = await instance.GET(
      input.cursor
        ? (input.cursor.replace(
            instance.clientOptions.baseUrl ?? '',
            '',
          ) as '/v2/cadences.json')
        : '/v2/cadences.json',
    )

    return {
      next_page_cursor: listResponse.parse(res.data).links?.next ?? undefined,
      items: res.data.data?.map(mappers.sequence) ?? [],
    }
  },
  listSequenceStates: async ({instance, input}) => {
    const res = await instance.GET(
      input.cursor
        ? (input.cursor.replace(
            instance.clientOptions.baseUrl ?? '',
            '',
          ) as '/v2/cadence_memberships.json')
        : '/v2/cadence_memberships.json',
    )

    return {
      next_page_cursor: listResponse.parse(res.data).links?.next ?? undefined,
      items: res.data.data?.map(mappers.sequenceState) ?? [],
    }
  },
  listAccounts: async ({instance, input}) => {
    const res = await instance.GET(
      input.cursor
        ? (input.cursor.replace(
            instance.clientOptions.baseUrl ?? '',
            '',
          ) as '/v2/accounts.json')
        : '/v2/accounts.json',
    )

    return {
      next_page_cursor: listResponse.parse(res.data).links?.next ?? undefined,
      items: res.data.data?.map(mappers.account) ?? [],
    }
  },
  listUsers: async ({instance, input}) => {
    const res = await instance.GET(
      input.cursor
        ? (input.cursor.replace(
            instance.clientOptions.baseUrl ?? '',
            '',
          ) as '/v2/users.json')
        : '/v2/users.json',
    )

    return {
      next_page_cursor: listResponse.parse(res.data).links?.next ?? undefined,
      items: res.data.data?.map(mappers.user) ?? [],
    }
  },
} satisfies SalesEngagementAdapter<SalesloftSDK>
