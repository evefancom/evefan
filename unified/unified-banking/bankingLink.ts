import * as rxjs from 'rxjs'
import * as Rx from 'rxjs/operators'
import type {AnyEntityPayload, Id, Link} from '@openint/cdk'
import type {PlaidSDKTypes} from '@openint/connector-plaid'
import type {postgresHelpers} from '@openint/connector-postgres'
import type {QBO} from '@openint/connector-qbo'
import type {Oas_accounting} from '@openint/connector-xero'
import {applyMapper} from '@openint/vdk'
import * as adapters from './adapters'

type Plaid = PlaidSDKTypes['oas']['components']
type Xero = Oas_accounting['components']['schemas']

type PostgresInputPayload =
  (typeof postgresHelpers)['_types']['destinationInputEntity']

export function bankingLink(ctx: {
  source: {
    id: Id['reso']
    connectorConfig: {connectorName: string}
    metadata?: unknown
  }
}): Link<AnyEntityPayload, PostgresInputPayload> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const categories: Record<string, boolean> =
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    (ctx.source.metadata as any)?.categories ?? {}

  return Rx.mergeMap((op) => {
    if (op.type !== 'data') {
      return rxjs.of(op)
    }

    if (ctx.source.connectorConfig.connectorName === 'xero') {
      if (op.data.entityName === 'Account') {
        const entity = op.data.entity as Xero['Account']
        if (entity.Class === 'REVENUE' || entity.Class === 'EXPENSE') {
          const mapped = applyMapper(
            adapters.xero.mappers.category,
            op.data.entity as Xero['Account'],
          )
          return rxjs.of({
            ...op,
            data: {
              id: mapped.id,
              entityName: 'banking_category',
              entity: {raw: op.data.entity, unified: mapped},
            } satisfies PostgresInputPayload,
          })
        } else {
          const mapped = applyMapper(
            adapters.xero.mappers.account,
            op.data.entity as Xero['Account'],
          )
          return rxjs.of({
            ...op,
            data: {
              id: mapped.id,
              entityName: 'banking_account',
              entity: {raw: op.data.entity, unified: mapped},
            } satisfies PostgresInputPayload,
          })
        }
      }
      if (op.data.entityName === 'BankTransaction') {
        // TODO: Dedupe from  qbo.purchase later
        const mapped = applyMapper(
          adapters.xero.mappers.bank_transaction,
          op.data.entity as Xero['BankTransaction'],
        )
        // TODO: Make this better, should at the minimum apply to both Plaid & QBO, options are
        // 1) Banking link needs to take input parameters to determine if by default
        // transactions should go through if metadata is missing or not
        // 2) Banking vertical should include abstraction for account / category selection UI etc.
        // 3) Extract this into a more generic filtering link that works for ANY entity.
        // In addition, will need to handle incremental sync state reset when we change stream filtering
        // parameter like this, as well as deleting the no longer relevant entities in destination
        if (
          // Support both name and ID
          !categories[mapped.category_name ?? ''] &&
          !categories[mapped.category_id ?? '']
        ) {
          console.log(
            `[banking] skip txn ${mapped.id} in ${mapped.category_id}: ${mapped.category_name}`,
          )
          return rxjs.EMPTY
        } else {
          console.log(
            `[banking] allow txn ${mapped.id} in ${mapped.category_id}: ${mapped.category_name}`,
          )
        }
        return rxjs.of({
          ...op,
          data: {
            id: mapped.id,
            entityName: 'banking_transaction',
            entity: {raw: op.data.entity, unified: mapped},
          } satisfies PostgresInputPayload,
        })
      }
    }
    if (ctx.source.connectorConfig.connectorName === 'qbo') {
      if (op.data.entityName === 'purchase') {
        const mapped = applyMapper(
          adapters.qbo.mappers.purchase,
          op.data.entity as QBO['Purchase'],
        )
        // TODO: Make this better, should at the minimum apply to both Plaid & QBO, options are
        // 1) Banking link needs to take input parameters to determine if by default
        // transactions should go through if metadata is missing or not
        // 2) Banking vertical should include abstraction for account / category selection UI etc.
        // 3) Extract this into a more generic filtering link that works for ANY entity.
        // In addition, will need to handle incremental sync state reset when we change stream filtering
        // parameter like this, as well as deleting the no longer relevant entities in destination
        if (
          // Support both name and ID
          !categories[mapped.category_name ?? ''] &&
          !categories[mapped.category_id ?? '']
        ) {
          console.log(
            `[banking] skip txn ${mapped.id} in ${mapped.category_id}: ${mapped.category_name}`,
          )
          return rxjs.EMPTY
        } else {
          console.log(
            `[banking] allow txn ${mapped.id} in ${mapped.category_id}: ${mapped.category_name}`,
          )
        }
        return rxjs.of({
          ...op,
          data: {
            id: mapped.id,
            entityName: 'banking_transaction',
            entity: {raw: op.data.entity, unified: mapped},
          } satisfies PostgresInputPayload,
        })
      }
      if (op.data.entityName === 'account') {
        const entity = op.data.entity as QBO['Account']
        if (
          entity.Classification === 'Revenue' ||
          entity.Classification === 'Expense'
        ) {
          const mapped = applyMapper(
            adapters.qbo.mappers.category,
            op.data.entity as QBO['Account'],
          )
          return rxjs.of({
            ...op,
            data: {
              id: mapped.id,
              entityName: 'banking_category',
              entity: {raw: op.data.entity, unified: mapped},
            } satisfies PostgresInputPayload,
          })
        } else {
          const mapped = applyMapper(
            adapters.qbo.mappers.account,
            op.data.entity as QBO['Account'],
          )
          return rxjs.of({
            ...op,
            data: {
              id: mapped.id,
              entityName: 'banking_account',
              entity: {raw: op.data.entity, unified: mapped},
            } satisfies PostgresInputPayload,
          })
        }
      }
      if (op.data.entityName === 'vendor') {
        const mapped = applyMapper(
          adapters.qbo.mappers.vendor,
          op.data.entity as QBO['Vendor'],
        )
        return rxjs.of({
          ...op,
          data: {
            id: mapped.id,
            entityName: 'banking_merchant',
            entity: {raw: op.data.entity, unified: mapped},
          } satisfies PostgresInputPayload,
        })
      }
    }
    if (ctx.source.connectorConfig.connectorName === 'plaid') {
      if (op.data.entityName === 'transaction') {
        const mapped = applyMapper(
          adapters.plaid.mappers.transaction,
          op.data.entity as Plaid['schemas']['Transaction'],
        )
        return rxjs.of({
          ...op,
          data: {
            id: mapped.id,
            entityName: 'banking_transaction',
            entity: {raw: op.data.entity, unified: mapped},
          } satisfies PostgresInputPayload,
        })
      }
      if (op.data.entityName === 'account') {
        const mapped = applyMapper(
          adapters.plaid.mappers.account,
          op.data.entity as Plaid['schemas']['AccountBase'],
        )
        return rxjs.of({
          ...op,
          data: {
            id: mapped.id,
            entityName: 'banking_account',
            entity: {raw: op.data.entity, unified: mapped},
          } satisfies PostgresInputPayload,
        })
      }
    }
    // Do not allow any other entities to pass through
    return rxjs.EMPTY
  })
}
