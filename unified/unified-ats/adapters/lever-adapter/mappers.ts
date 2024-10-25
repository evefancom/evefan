import {type LeverObjectType} from '@openint/connector-lever'
import {mapper, zCast} from '@openint/vdk'
import * as unified from '../../unifiedModels'

const contact = mapper(zCast<LeverObjectType['contact']>(), unified.candidate, {
  id: (record) => String(record.id),
  // TODO: Add fields here after getting more clarity on each field .
  // created_at: 'created_at',
  // modified_at: 'updated_at',
  name: 'name',
  // last_name: 'last_name',
  // company: 'company',
  title: 'headline',
  // last_interaction_at: 'last_activity',
  is_private: 'isAnonymized',
  // can_email: 'can_email',
  locations: 'location',
  phone_numbers: 'phones',
  email_addresses: 'emails',
  // tags: 'tags',
  // applications: 'applications',
  // attachments: 'attachments',
})

const opportunity = mapper(
  zCast<LeverObjectType['opportunity']>(),
  unified.candidate,
  {
    id: (record) => String(record.id),
    created_at: (record) => String(record.createdAt),
    modified_at: (record) => String(record.updatedAt),
    name: 'name',
    company: 'headline',
    email_addresses: (record) => record.emails?.map((e) => ({value: e})), // No concept of type in Lever emails
    phone_numbers: (record) => record.phones?.map((e) => ({value: e})),
    is_private: (record) => record.confidentiality === 'confidential',
    last_interaction_at: (record) => String(record.lastInteractionAt),
    tags: 'tags',
    applications: 'applications',
    locations: (record) => record.phones?.map((e) => ({value: e})),
  },
)

const posting = mapper(zCast<LeverObjectType['posting']>(), unified.job, {
  id: (record) => String(record.id),
  created_at: (record) => String(record.createdAt),
  modified_at: (record) => String(record.updatedAt),
  name: 'text',
  confidential: (record) => record.confidentiality === 'confidential',
  departments: 'tags',
  // offices: 'offic',
  hiring_managers: 'hiringManager',
  // recruiters: 'hiring_team.recruiters',
})

const tag = mapper(zCast<LeverObjectType['tag']>(), unified.department, {
  name: 'text',
})

const offer = mapper(zCast<LeverObjectType['offer']>(), unified.offer, {
  id: (record) => String(record.id),
  created_at: (record) => String(record.createdAt),
  // setting the same as created at as they don't have an updated at field
  modified_at: (record) => String(record.createdAt),
  // @ts-expect-error the object does not link to an application. How do we handle these?
  application: '',
  closed_at: (record) => String(record['resolvedAt']),
  sent_at: (record) => String(record['sentAt']),
  // @ts-expect-error the object does not have a start date
  start_date: 'startDate',
  status: 'status',
})

export const mappers = {
  contact,
  opportunity,
  posting,
  tag,
  offer,
}
