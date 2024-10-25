'use client'

import {Hydrate} from '@tanstack/react-query'
import React from 'react'
import superjson from 'superjson'
import type {SuperJSONResult} from 'superjson/dist/types'

export type DehydratedState = SuperJSONResult

/**
 * Hydrate using superjson
 * TODO: Figure out if we can use SuperHydrate multiple times for different parts of the app
 * or if it can only be called once for the entire app's state without ability to merge them together
 */
export function SuperHydrate(props: {
  dehydratedState?: DehydratedState
  children: React.ReactNode
}) {
  return (
    <Hydrate
      state={
        props.dehydratedState && superjson.deserialize(props.dehydratedState)
      }>
      {props.children}
    </Hydrate>
  )
}
