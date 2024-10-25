/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import * as rxjs from 'rxjs'
import * as Rx from 'rxjs/operators'
import type {AnyEntityPayload, Id, Link} from '@openint/cdk'
import type {postgresHelpers} from '@openint/connector-postgres'
import {applyMapper} from '@openint/vdk'
import {mappers as greenhouseMapper} from './adapters/greenhouse-adapter/mappers'
import {mappers as leverMapper} from './adapters/lever-adapter/mappers'

type PostgresInputPayload =
  (typeof postgresHelpers)['_types']['destinationInputEntity']

export function atsLink(ctx: {
  source: {
    id: Id['reso']
    connectorConfig: {connectorName: string}
    metadata?: unknown
  }
}): Link<AnyEntityPayload, PostgresInputPayload> {
  return Rx.mergeMap((op) => {
    if (op.type !== 'data') {
      return rxjs.of(op)
    }

    // TODO; generalize
    const mappers =
      ctx.source.connectorConfig.connectorName === 'greenhouse'
        ? greenhouseMapper
        : leverMapper

    const entityName = op.data.entityName
    // @ts-expect-error for now
    const mapper = mappers[entityName]
    if (!mapper) {
      console.warn(
        `No ${entityName} entity mapper found for connector: ${ctx.source.connectorConfig.connectorName}`,
        JSON.stringify(mappers),
      )
      return rxjs.EMPTY
    }

    const mapped = applyMapper(mapper, op.data.entity)

    return rxjs.of({
      ...op,
      data: {
        id: mapped.id,
        entityName,
        entity: {raw: op.data.entity, unified: mapped},
      },
    })
  })
}
