import {setAutoFreeze} from 'immer'

// Auto-freeze is not cool...
// @see https://github.com/immerjs/immer/issues/959
setAutoFreeze(false)

// Should this live in its own separate file?
export {produce} from 'immer' // Auto-freeze is cool
export type {WritableDraft} from 'immer/dist/types/types-external' // Auto-freeze is cool
