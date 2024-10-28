import {z} from '@opensdks/util-zod'
import {objectKeys, R, titleCase} from '@openint/util'

interface VerticalInfo {
  name?: string
  description?: string
  objects?: string[]
}

// TODO: Should this correspond to the list of unified apis we have actually implemented?
// Doesn't seem quite right otherwise...
// Also maybe should be distributed in a metadata file associated with each unified api
// impl.
const _VERTICAL_BY_KEY = {
  banking: {},
  accounting: {},
  crm: {
    name: 'CRM',
    objects: ['account', 'contact', 'opportunity', 'lead', 'user'],
  },
  'sales-engagement': {},
  engagement: {}, // TODO: merge me
  commerce: {},
  'expense-management': {},
  enrichment: {},
  database: {},
  'flat-files-and-spreadsheets': {},
  'file-storage': {},
  streaming: {},
  'personal-finance': {},
  other: {},
  hris: {},
  payroll: {},
  calendar: {},
  ats: {
    name: 'ATS',
    description: `Our secure API identifies employees and compensation by
                integrating with your payroll. Only users who are invited to the
                platform can access this information, and the integration is
                one-way with no impact on original data.`,
    objects: ['job', 'offer', 'candidate', 'opening'],
  },
} satisfies Record<string, VerticalInfo>

// MARK: -

export const zVerticalKey = z.enum(objectKeys(_VERTICAL_BY_KEY))

export type VerticalKey = keyof typeof _VERTICAL_BY_KEY

export const VERTICAL_BY_KEY = R.mapValues(
  _VERTICAL_BY_KEY,
  (c: VerticalInfo, key) => ({
    ...c,
    key,
    name: c.name ?? titleCase(key),
  }),
)

export type Vertical = (typeof VERTICAL_BY_KEY)[keyof typeof VERTICAL_BY_KEY]
