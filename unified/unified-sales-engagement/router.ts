import type {AdapterFromRouter, RouterMeta} from '@openint/vdk'
import {proxyCallAdapter, trpc, verticalProcedure, z} from '@openint/vdk'
import adapters from './adapters'
import * as unified from './unifiedModels'

export {unified}

function oapi(meta: NonNullable<RouterMeta['openapi']>): RouterMeta {
  return {openapi: {...meta, path: `/unified/sales-engagement${meta.path}`}}
}

const procedure = verticalProcedure(adapters)

export const salesEngagementRouter = trpc.router({
  listContacts: procedure
    .meta(oapi({method: 'GET', path: '/contact'}))
    .input(z.object({cursor: z.string().nullish()}))
    .output(
      z.object({
        next_page_cursor: z.string().nullish(),
        items: z.array(unified.contact),
      }),
    )
    .query(async ({input, ctx}) => proxyCallAdapter({input, ctx})),
  listSequences: procedure
    .meta(oapi({method: 'GET', path: '/sequence'}))
    .input(z.object({cursor: z.string().nullish()}))
    .output(
      z.object({
        next_page_cursor: z.string().nullish(),
        items: z.array(unified.sequence),
      }),
    )
    .query(async ({input, ctx}) => proxyCallAdapter({input, ctx})),
  listSequenceStates: procedure
    .meta(oapi({method: 'GET', path: '/sequence_state'}))
    .input(z.object({cursor: z.string().nullish()}))
    .output(
      z.object({
        next_page_cursor: z.string().nullish(),
        items: z.array(unified.sequenceState),
      }),
    )
    .query(async ({input, ctx}) => proxyCallAdapter({input, ctx})),
  listUsers: procedure
    .meta(oapi({method: 'GET', path: '/user'}))
    .input(z.object({cursor: z.string().nullish()}))
    .output(
      z.object({
        next_page_cursor: z.string().nullish(),
        items: z.array(unified.user),
      }),
    )
    .query(async ({input, ctx}) => proxyCallAdapter({input, ctx})),
  listAccounts: procedure
    .meta(oapi({method: 'GET', path: '/account'}))
    .input(z.object({cursor: z.string().nullish()}))
    .output(
      z.object({
        next_page_cursor: z.string().nullish(),
        items: z.array(unified.account),
      }),
    )
    .query(async ({input, ctx}) => proxyCallAdapter({input, ctx})),
  listMailboxes: procedure
    .meta(oapi({method: 'GET', path: '/mailbox'}))
    .input(z.object({cursor: z.string().nullish()}))
    .output(
      z.object({
        next_page_cursor: z.string().nullish(),
        items: z.array(unified.mailbox),
      }),
    )
    .query(async ({input, ctx}) => proxyCallAdapter({input, ctx})),
  upsertAccount: procedure
    .meta(oapi({method: 'POST', path: '/account/_upsert'}))
    .input(
      z.object({
        record: z.object({
          name: z.string().nullish().openapi({example: 'My Company'}),
          domain: z.string().nullish().openapi({example: 'mycompany.com'}),
          owner_id: z
            .string()
            .nullish()
            .openapi({example: '9f3e97fd-4d5d-4efc-959d-bbebfac079f5'}),
          account_id: z
            .string()
            .nullish()
            .openapi({example: 'ae4be028-9078-4850-a0bf-d2112b7c4d11'}),
          custom_fields: z.record(z.unknown()).nullish(),
        }),
        upsert_on: z.object({
          name: z.string().optional().openapi({
            description:
              'The name of the account to upsert on. Supported for Outreach, Salesloft, and Apollo.',
          }),
          domain: z
            .string()
            .optional()
            .describe(
              'The domain of the account to upsert on. Only supported for Outreach and Salesloft.',
            ),
        }),
      }),
    )
    .output(z.object({record: z.object({id: z.string()}).optional()}))
    .query(async ({input, ctx}) => proxyCallAdapter({input, ctx})),
  upsertContact: procedure
    .meta(oapi({method: 'POST', path: '/contact/_upsert'}))
    .input(
      z.object({
        record: z.object({
          first_name: z.string().nullish().openapi({example: 'James'}),
          last_name: z.string().nullish().openapi({example: 'Smith'}),
          job_title: z.string().nullish().openapi({example: 'CEO'}),
          address: z
            .object({
              city: z.string().nullish(),
              country: z.string().nullish(),
              postal_code: z.string().nullish(),
              state: z.string().nullish(),
              street_1: z.string().nullish(),
              street_2: z.string().nullish(),
            })
            .openapi({
              example: {
                city: 'San Francisco',
                country: 'US',
                postal_code: '94107',
                state: 'CA',
                street_1: '525 Brannan',
                street_2: null,
              },
            }),
          email_addresses: z
            .array(
              z.object({
                email_address: z.string(),
                email_address_type: z
                  .enum(['primary', 'personal', 'work'])
                  .nullish(),
              }),
            )
            .openapi({
              example: [
                {
                  email_address: 'hello@revtron.ai',
                  email_address_type: 'work',
                },
              ],
            }),
          phone_numbers: z
            .array(
              z.object({
                phone_number: z.string(),
                phone_number_type: z.enum([
                  'primary',
                  'work',
                  'home',
                  'mobile',
                  'other',
                ]),
              }),
            )
            .openapi({
              example: [
                {
                  phone_number: '+14151234567',
                  phone_number_type: 'work',
                },
              ],
            }),
          owner_id: z
            .string()
            .nullish()
            .openapi({example: '9f3e97fd-4d5d-4efc-959d-bbebfac079f5'}),
          account_id: z
            .string()
            .nullish()
            .openapi({example: 'ae4be028-9078-4850-a0bf-d2112b7c4d11'}),
          custom_fields: z.record(z.unknown()).nullish(),
        }),
        upsert_on: z.object({
          email: z.string().optional().openapi({
            description:
              'Contact email to upsert on. Supported for Outreach, Salesloft, and Apollo.',
          }),
        }),
      }),
    )
    .output(z.object({record: z.object({id: z.string()}).optional()}))
    .query(async ({input, ctx}) => proxyCallAdapter({input, ctx})),
  insertSequenceState: procedure
    .meta(oapi({method: 'POST', path: '/sequence_state'}))
    .input(
      z.object({
        record: z.object({
          contact_id: z
            .string()
            .openapi({example: '9f3e97fd-4d5d-4efc-959d-bbebfac079f5'}),
          mailbox_id: z
            .string()
            .openapi({example: 'ae4be028-9078-4850-a0bf-d2112b7c4d11'}),
          sequence_id: z
            .string()
            .openapi({example: 'b854e510-1c40-4ef6-ade4-8eb35f49d331'}),
          user_id: z
            .string()
            .nullish()
            .openapi({example: 'c590dc63-8e43-48a4-8154-1fbb00ac936b'}),
        }),
      }),
    )
    .output(z.object({record: z.object({id: z.string()}).optional()}))
    .query(async ({input, ctx}) => proxyCallAdapter({input, ctx})),
})

export type SalesEngagementAdapter<TInstance> = AdapterFromRouter<
  typeof salesEngagementRouter,
  TInstance
>
