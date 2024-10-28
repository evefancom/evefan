import {EventSchemas, Inngest} from 'inngest'
import {eventsMap} from './events'

export const inngest = new Inngest({
  id: 'openint',
  schemas: new EventSchemas().fromZod(eventsMap),
})

export * from './events'
