import {type GreenhouseObjectType} from '@openint/connector-greenhouse'
import {mapper, zCast} from '@openint/vdk'
import * as unified from '../../unifiedModels'

const candidate = mapper(
  zCast<GreenhouseObjectType['candidate']>(),
  unified.candidate,
  {
    id: (record) => String(record.id),
    created_at: 'created_at',
    modified_at: 'updated_at',
    first_name: 'first_name',
    last_name: 'last_name',
    company: 'company',
    title: 'title',
    last_interaction_at: 'last_activity',
    is_private: 'is_private',
    can_email: 'can_email',
    locations: 'addresses',
    phone_numbers: 'phone_numbers',
    email_addresses: 'email_addresses',
    tags: 'tags',
    applications: (record) => record.application_ids,
    attachments: 'attachments',
  },
)

const department = mapper(
  zCast<GreenhouseObjectType['department']>(),
  unified.department,
  {
    id: (record) => String(record.id),
    // NOTE: Greenhouse doesn't support the timestamp fields
    // created_at: '',
    // modified_at: '',
    name: 'name',
    parent_id: 'parent_id',
    parent_department_external_id: 'parent_department_external_ids',
    child_ids: 'child_ids',
    child_department_external_ids: 'child_department_external_ids',
  },
)

const job = mapper(zCast<GreenhouseObjectType['job']>(), unified.job, {
  id: (record) => String(record.id),
  created_at: 'created_at',
  modified_at: 'updated_at',
  name: 'name',
  confidential: 'confidential',
  departments: (record) =>
    record.departments?.filter((d) => !!d).map(department) ?? [],
  offices: 'offices',
  hiring_managers: 'hiring_team.hiring_managers',
  recruiters: 'hiring_team.recruiters',
})

const offer = mapper(zCast<GreenhouseObjectType['offer']>(), unified.offer, {
  id: (record) => String(record.id),
  created_at: 'created_at',
  modified_at: 'updated_at',
  application: (record) => String(record.application_id),
  closed_at: 'opening.closed_at',
  sent_at: 'sent_at',
  start_date: 'starts_at',
  status: 'status',
})

const opening = mapper(zCast<GreenhouseObjectType['opening'] & {job_id: string}>(), unified.opening, {
  id: (record) => String(record.id),
  created_at: 'opened_at',
  // Greenhouse doesn't provide a separate 'updated_at' field for job openings so we can used the greater of created or closed at.
  modified_at: (record) => record.closed_at || record.opened_at, 
  status: 'status',
  job_id: 'job_id',
})


export const mappers = {
  candidate,
  department,
  job,
  offer,
  opening
}
