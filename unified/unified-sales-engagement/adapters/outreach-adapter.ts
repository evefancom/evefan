import {type OutreachSDK, type OutreachSDKTypes} from '@opensdks/sdk-outreach'
import {mapper, z, zCast} from '@openint/vdk'
import type {SalesEngagementAdapter} from '../router'
import type {EmailAddress, PhoneNumber} from '../unifiedModels'
import * as unified from '../unifiedModels'

type Outreach = OutreachSDKTypes['oas']['components']['schemas']

/** Outreach OpenAPI is unfortunately incomplete */
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
  contact: mapper(zCast<Outreach['prospectResponse']>(), unified.contact, {
    id: (r) => r.id?.toString() ?? '',
    first_name: (r) => r.attributes?.firstName ?? '',
    last_name: (r) => r.attributes?.lastName ?? '',
    owner_id: (r) => r.relationships?.owner?.data?.id?.toString() ?? '',
    account_id: (r) => r.relationships?.account?.data?.id?.toString(),
    job_title: (r) => r.attributes?.title ?? '',
    address: (r) => ({
      city: r.attributes?.addressCity ?? '',
      country: r.attributes?.addressCountry ?? '',
      postal_code: r.attributes?.addressZip ?? '',
      state: r.attributes?.addressState ?? '',
      street_1: r.attributes?.addressStreet ?? '',
      street_2: r.attributes?.addressStreet2 ?? '',
    }),
    email_addresses: (r) => {
      const emails: EmailAddress[] = []
      r.attributes?.emails?.forEach((record) => {
        emails.push({
          email_address: record,
          email_address_type: 'primary',
        })
      })
      return emails
    },
    phone_numbers: (r) => {
      const phoneNumbers: PhoneNumber[] = []
      r.attributes?.workPhones?.forEach((record) => {
        phoneNumbers.push({
          phone_number: record,
          phone_number_type: 'work',
        })
      })
      r.attributes?.homePhones?.forEach((record) => {
        phoneNumbers.push({
          phone_number: record,
          phone_number_type: 'home',
        })
      })
      r.attributes?.mobilePhones?.forEach((record) => {
        phoneNumbers.push({
          phone_number: record,
          phone_number_type: 'mobile',
        })
      })
      r.attributes?.otherPhones?.forEach((record) => {
        phoneNumbers.push({
          phone_number: record,
          phone_number_type: 'other',
        })
      })
      return phoneNumbers
    },
    open_count: (r) => r.attributes?.openCount ?? 0,
    click_count: (r) => r.attributes?.clickCount ?? 0,
    reply_count: (r) => r.attributes?.replyCount ?? 0,
    // TODO: Needs to confirm bouncedCount with Tony
    bounced_count: (r) => r.attributes?.openCount ?? 0,
    created_at: (r) => r.attributes?.createdAt ?? new Date().toISOString(),
    updated_at: (r) => r.attributes?.updatedAt ?? new Date().toISOString(),
    is_deleted: () => false,
    last_modified_at: (r) =>
      r.attributes?.updatedAt ?? new Date().toISOString(),
    raw_data: (r) => r,
  }),
  sequence: mapper(zCast<Outreach['sequenceResponse']>(), unified.sequence, {
    id: (r) => r.id?.toString() ?? '',
    name: (r) => r.attributes?.name ?? '',
    created_at: (r) => r.attributes?.createdAt ?? new Date().toISOString(),
    updated_at: (r) => r.attributes?.updatedAt ?? new Date().toISOString(),
    is_deleted: () => false,
    last_modified_at: (r) =>
      r.attributes?.updatedAt ?? new Date().toISOString(),
    owner_id: (r) => r.relationships?.owner?.data?.id?.toString() ?? '',
    tags: (r) => r.attributes?.tags ?? [],
    num_steps: (r) => r.attributes?.sequenceStepCount ?? 0,
    metrics: (r) => ({
      scheduleCount: r.attributes?.scheduleCount ?? 0,
      openCount: r.attributes?.openCount ?? 0,
      optOutCount: r.attributes?.optOutCount ?? 0,
      clickCount: r.attributes?.clickCount ?? 0,
      replyCount: r.attributes?.replyCount ?? 0,
      deliverCount: r.attributes?.deliverCount ?? 0,
      failureCount: r.attributes?.failureCount ?? 0,
      neutralReplyCount: r.attributes?.neutralReplyCount ?? 0,
      negativeReplyCount: r.attributes?.negativeReplyCount ?? 0,
      positiveReplyCount: r.attributes?.positiveReplyCount ?? 0,
      numRepliedProspects: r.attributes?.numRepliedProspects ?? 0,
      numContactedProspects: r.attributes?.numContactedProspects ?? 0,
    }),
    is_enabled: (r) => r.attributes?.enabled ?? false,
    raw_data: (r) => r,
  }),
  account: mapper(zCast<Outreach['accountResponse']>(), unified.account, {
    id: (r) => r.id?.toString() ?? '',
    name: (r) => r.attributes?.name ?? '',
    created_at: (r) => r.attributes?.createdAt ?? new Date().toISOString(),
    updated_at: (r) => r.attributes?.updatedAt ?? new Date().toISOString(),
    is_deleted: () => false,
    last_modified_at: (r) =>
      r.attributes?.updatedAt ?? new Date().toISOString(),
    owner_id: (r) => r.relationships?.owner?.data?.id?.toString() ?? '',
    domain: (r) => r.attributes?.domain ?? '',
    raw_data: (r) => r,
  }),
  sequenceState: mapper(
    zCast<Outreach['sequenceStateResponse']>(),
    unified.sequenceState,
    {
      id: (r) => r.id?.toString() ?? '',
      state: (r) => r.attributes?.state ?? '',
      created_at: (r) => r.attributes?.createdAt ?? new Date().toISOString(),
      updated_at: (r) => r.attributes?.updatedAt ?? new Date().toISOString(),
      is_deleted: () => false,
      last_modified_at: (r) =>
        r.attributes?.updatedAt ?? new Date().toISOString(),
      sequence_id: (r) => r.relationships?.sequence?.data?.id?.toString() ?? '',
      contact_id: (r) => r.relationships?.prospect?.data?.id?.toString() ?? '',
      mailbox_id: (r) => r.relationships?.mailbox?.data?.id?.toString() ?? '',
      user_id: (r) => r.relationships?.creator?.data?.id?.toString() ?? '',
      raw_data: (r) => r,
    },
  ),
  mailbox: mapper(zCast<Outreach['mailboxResponse']>(), unified.mailbox, {
    id: (r) => r.id?.toString() ?? '',
    email: (r) => r.attributes?.email ?? '',
    created_at: (r) => r.attributes?.createdAt ?? new Date().toISOString(),
    updated_at: (r) => r.attributes?.updatedAt ?? new Date().toISOString(),
    is_deleted: () => false,
    last_modified_at: (r) =>
      r.attributes?.updatedAt ?? new Date().toISOString(),
    user_id: (r) => r.relationships?.user?.data?.id?.toString() ?? '',
    raw_data: (r) => r,
  }),
  user: mapper(zCast<Outreach['userResponse']>(), unified.user, {
    id: (r) => r.id?.toString() ?? '',
    first_name: (r) => r.attributes?.firstName ?? '',
    last_name: (r) => r.attributes?.lastName ?? '',
    email: (r) => r.attributes?.email ?? '',
    created_at: (r) => r.attributes?.createdAt ?? new Date().toISOString(),
    updated_at: (r) => r.attributes?.updatedAt ?? new Date().toISOString(),
    is_deleted: () => false,
    last_modified_at: (r) =>
      r.attributes?.updatedAt ?? new Date().toISOString(),
    raw_data: (r) => r,
  }),
}

export const outreachAdapter = {
  listContacts: async ({instance, input}) => {
    const res = await instance.GET(
      input.cursor
        ? // Need this for now because SDK cannot handlle absolute URL just yet.
          (input.cursor.replace(
            instance.clientOptions.baseUrl ?? '',
            '',
          ) as '/prospects')
        : '/prospects',
    )
    return {
      next_page_cursor: listResponse.parse(res.data).links?.next ?? undefined,
      items: res.data.data?.map(mappers.contact) ?? [],
    }
  },
  listSequences: async ({instance, input}) => {
    const res = await instance.GET(
      input.cursor
        ? // Need this for now because SDK cannot handlle absolute URL just yet.
          (input.cursor.replace(
            instance.clientOptions.baseUrl ?? '',
            '',
          ) as '/sequences')
        : '/sequences',
    )

    return {
      next_page_cursor: listResponse.parse(res.data).links?.next ?? undefined,
      items: res.data.data?.map(mappers.sequence) ?? [],
    }
  },
  listSequenceStates: async ({instance, input}) => {
    const res = await instance.GET(
      input.cursor
        ? // Need this for now because SDK cannot handlle absolute URL just yet.
          (input.cursor.replace(
            instance.clientOptions.baseUrl ?? '',
            '',
          ) as '/sequenceStates')
        : '/sequenceStates',
    )

    return {
      next_page_cursor: listResponse.parse(res.data).links?.next ?? undefined,
      items: res.data.data?.map(mappers.sequenceState) ?? [],
    }
  },
  listAccounts: async ({instance, input}) => {
    const res = await instance.GET(
      input.cursor
        ? // Need this for now because SDK cannot handlle absolute URL just yet.
          (input.cursor.replace(
            instance.clientOptions.baseUrl ?? '',
            '',
          ) as '/accounts')
        : '/accounts',
    )

    return {
      next_page_cursor: listResponse.parse(res.data).links?.next ?? undefined,
      items: res.data.data?.map(mappers.account) ?? [],
    }
  },
  listMailboxes: async ({instance, input}) => {
    const res = await instance.GET(
      input.cursor
        ? // Need this for now because SDK cannot handlle absolute URL just yet.
          (input.cursor.replace(
            instance.clientOptions.baseUrl ?? '',
            '',
          ) as '/mailboxes')
        : '/mailboxes',
    )

    return {
      next_page_cursor: listResponse.parse(res.data).links?.next ?? undefined,
      items: res.data.data?.map(mappers.mailbox) ?? [],
    }
  },
  listUsers: async ({instance, input}) => {
    const res = await instance.GET(
      input.cursor
        ? // Need this for now because SDK cannot handlle absolute URL just yet.
          (input.cursor.replace(
            instance.clientOptions.baseUrl ?? '',
            '',
          ) as '/users')
        : '/users',
    )

    return {
      next_page_cursor: listResponse.parse(res.data).links?.next ?? undefined,
      items: res.data.data?.map(mappers.user) ?? [],
    }
  },
  upsertAccount: async ({instance, input}) => {
    const {domain, name} = input.upsert_on

    if (!domain && !name) {
      throw new Error('Must specify at least one upsert_on field')
    }

    const res = await instance.GET('/accounts', {
      params: {
        query: {
          ...(name && {'filter[name]': name}),
          ...(name && {'filter[domain]': domain}),
        },
      },
    })
    if ((res.data.data?.length ?? 0) > 1) {
      throw new Error('More than one account found for upsertOn fields')
    }
    const existingAccount = res.data.data?.[0]
    if (existingAccount?.id) {
      const updateRes = await instance.PATCH('/accounts/{id}', {
        params: {path: {id: existingAccount.id}},
        body: {
          data: {
            id: existingAccount.id,
            type: 'account',
            attributes: {
              name,
              domain: domain ?? input.record.domain ?? undefined,
              ...input.record.custom_fields,
            },
            relationships: {
              owner: input.record.owner_id
                ? {
                    data: {
                      type: 'user',
                      id: Number.parseInt(input.record.owner_id, 10),
                    },
                  }
                : undefined,
            },
          },
        },
      })
      return {record: {id: `${updateRes.data.data?.id}`}}
    } else {
      const createRes = await instance.POST('/accounts', {
        body: {
          data: {
            type: 'account',
            attributes: {
              name,
              domain,
              ...input.record.custom_fields,
            },
            relationships: {
              owner: input.record.owner_id
                ? {
                    data: {
                      type: 'user',
                      id: Number.parseInt(input.record.owner_id, 10),
                    },
                  }
                : undefined,
            },
          },
        },
      })
      return {record: {id: `${createRes.data.data?.id}`}}
    }
  },
  upsertContact: async ({instance, input}) => {
    const {email} = input.upsert_on
    if (!email) {
      throw new Error('Must specify at least one upsert_on field')
    }

    const res = await instance.GET('/prospects', {
      params: {
        query: {
          ...(email && {'filter[emails]': [email]}),
        },
      },
    })
    if ((res.data.data?.length ?? 0) > 1) {
      throw new Error('More than one contact found for upsertOn fields')
    }

    const attributes = {
      firstName: input.record.first_name ?? undefined,
      lastName: input.record.last_name ?? undefined,
      title: input.record.job_title ?? undefined,
      addressCity: input.record.address.city ?? undefined,
      addressCountry: input.record.address.country ?? undefined,
      addressState: input.record.address.state ?? undefined,
      addressStreet: input.record.address.street_1 ?? undefined,
      addressStreet2: input.record.address.street_2 ?? undefined,
      addressZip: input.record.address.postal_code ?? undefined,
      homePhones: input.record.phone_numbers
        .filter((p) => p.phone_number_type === 'home')
        .map((p) => p.phone_number),
      workPhones: input.record.phone_numbers
        .filter((p) => p.phone_number_type === 'work')
        .map((p) => p.phone_number),
      mobilePhones: input.record.phone_numbers
        .filter((p) => p.phone_number_type === 'mobile')
        .map((p) => p.phone_number),
      otherPhones: input.record.phone_numbers
        .filter((p) => p.phone_number_type === 'other')
        .map((p) => p.phone_number),
      emails: input.record.email_addresses.map((e) => e.email_address),
      ...input.record.custom_fields,
    }

    const existingContact = res.data.data?.[0]
    if (existingContact?.id) {
      const updateRes = await instance.PATCH('/prospects/{id}', {
        params: {path: {id: existingContact.id}},
        body: {
          data: {
            id: existingContact.id,
            type: 'prospect',
            attributes,
            relationships: {
              owner: input.record.owner_id
                ? {
                    data: {
                      type: 'user',
                      id: Number.parseInt(input.record.owner_id, 10),
                    },
                  }
                : undefined,
              account: input.record.account_id
                ? {
                    data: {
                      type: 'account',
                      id: Number.parseInt(input.record.account_id, 10),
                    },
                  }
                : undefined,
            },
          },
        },
      })
      return {record: {id: `${updateRes.data.data?.id}`}}
    } else {
      const createRes = await instance.POST('/prospects', {
        body: {
          data: {
            type: 'prospect',
            attributes,
            relationships: {
              owner: input.record.owner_id
                ? {
                    data: {
                      type: 'user',
                      id: Number.parseInt(input.record.owner_id, 10),
                    },
                  }
                : undefined,
              account: input.record.account_id
                ? {
                    data: {
                      type: 'account',
                      id: Number.parseInt(input.record.account_id, 10),
                    },
                  }
                : undefined,
            },
          },
        },
      })
      return {record: {id: `${createRes.data.data?.id}`}}
    }
  },
  insertSequenceState: async ({instance, input}) => {
    const res = await instance.GET('/sequenceStates', {
      params: {
        query: {
          'filter[prospect][id]': input.record.contact_id,
          'filter[sequence][id]': input.record.sequence_id,
        },
      },
    })

    if ((res.data.data?.length ?? 0) > 0) {
      return {record: {id: `${res.data.data?.[0]?.id}`}}
    }

    const createRes = await instance.POST('/sequenceStates', {
      body: {
        data: {
          type: 'sequenceState',
          relationships: {
            prospect: {
              data: {
                type: 'prospect',
                id: Number.parseInt(input.record.contact_id, 10),
              },
            },
            mailbox: {
              data: {
                type: 'mailbox',
                id: Number.parseInt(input.record.mailbox_id, 10),
              },
            },
            sequence: {
              data: {
                type: 'sequence',
                id: Number.parseInt(input.record.sequence_id, 10),
              },
            },
            creator: input.record.user_id
              ? {
                  data: {
                    type: 'user',
                    id: Number.parseInt(input.record.user_id, 10),
                  },
                }
              : undefined,
          },
        },
      },
    })
    return {record: {id: `${createRes.data.data?.id}`}}
  },
} satisfies SalesEngagementAdapter<OutreachSDK>
