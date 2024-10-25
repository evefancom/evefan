import type {
  AnyEntityPayload,
  ConnectorDef,
  ConnectorSchemas,
} from '@openint/cdk'
import {connHelpers} from '@openint/cdk'
import {z, zCast} from '@openint/util'

// MARK: - Source Sync

export const zWatchPathsInput = z.object({
  basePath: z.string(),
  paths: z.array(z.string()).optional(),
})

export const fsSchemas = {
  name: z.literal('fs'),
  resourceSettings: zWatchPathsInput.pick({basePath: true}),
  /**
   * `paths` only used for sourceSync, not destSync. Though these are not technically states...
   * And they are not safe to just erase if fullSync = true.
   * TODO: Introduce a separate sourceOptions / destinationOptions type later when it becomes an
   * actual problem... for now this issue only impacts FirebaseProvider and FSProvider
   * which are not actually being used as top level providers
   */
  sourceState: zWatchPathsInput.pick({paths: true}),
  sourceOutputEntity: zCast<AnyEntityPayload>(),
  destinationInputEntity: zCast<AnyEntityPayload>(),
} satisfies ConnectorSchemas

export const fsHelpers = connHelpers(fsSchemas)

export const fsDef = {
  name: 'fs',
  metadata: {
    logoUrl: '/_assets/logo-filesystem.svg',
    platforms: ['local'],
    displayName: 'File system',
    verticals: ['flat-files-and-spreadsheets'],
  },

  schemas: fsSchemas,
} satisfies ConnectorDef<typeof fsSchemas>

export default fsDef
