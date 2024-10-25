import '@openint/app-config/register.node'
import {parseArgs} from 'node:util'
import * as routines from './routines'

/** Mimic subset of Inngest StepTools UI */
const step: routines.FunctionInput<never>['step'] = {
  run: (name, fn) => {
    console.log('[step.run]', name)
    return fn()
  },
  // eslint-disable-next-line @typescript-eslint/require-await
  sendEvent: async (stepId, events) => {
    console.log('[step.sendEvent]', stepId, JSON.stringify(events, null, 2))
  },
}

const {
  positionals: [cmd],
} = parseArgs({
  // options: {output: {type: 'string', short: 'o'}},
  allowPositionals: true,
})

switch (cmd) {
  case 'scheduleSyncs':
    void routines.scheduleSyncs({
      event: {
        name: '' as never,
        data: {} as never,
      },
      step,
    })
    break
  case 'syncPipeline':
    void routines.syncPipeline({
      event: {
        name: 'sync/pipeline-requested',
        data: {pipelineId: process.env['PIPELINE_ID'] as `pipe_${string}`},
      },
      step,
    })
    break
  default:
    console.error('Unknown command', cmd)
}
