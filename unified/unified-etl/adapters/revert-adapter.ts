import {type revertServer} from '@openint/connector-revert'
import type {Adapter} from '../router'

export default {
  readStream: async ({instance, input}) => {
    const plural = revertPluralize(input.stream)
    const res = await instance.GET(`/crm/${plural as 'companies'}`, {
      params: {query: {cursor: input.cursor, fields: input.fields?.join(',')}},
    })
    return {
      has_next_page: !!res.data.next,
      items: res.data.results,
      next_cursor: null, // To be implemented
    }
  },
  read: async ({instance, input}) => {
    const contactStream = input.catalog.streams.find(
      (s) => s.stream.name === 'contact',
    )
    if (!contactStream) {
      return []
    }
    const res = await instance.GET('/crm/contacts', {
      params: {
        query: {
          cursor: input.state.stream_states.find(
            (s) => s.stream_description.name === 'contact',
          )?.stream_state?.['cursor'] as string | undefined,
          fields: contactStream.additional_fields?.join(','),
        },
      },
    })
    return res.data.results.map((com) => ({
      type: 'RECORD',
      record: {stream: 'contact', data: com},
    }))
  },
} satisfies Adapter<ReturnType<(typeof revertServer)['newInstance']>>

function revertPluralize(word: string) {
  // Apply basic pluralization rules
  if (
    word.endsWith('s') ||
    word.endsWith('ch') ||
    word.endsWith('sh') ||
    word.endsWith('x') ||
    word.endsWith('z')
  ) {
    return word + 'es'
  } else if (
    word.endsWith('y') &&
    !['a', 'e', 'i', 'o', 'u'].includes(word.charAt(word.length - 2))
  ) {
    return word.slice(0, -1) + 'ies'
  } else {
    return word + 's'
  }
}
