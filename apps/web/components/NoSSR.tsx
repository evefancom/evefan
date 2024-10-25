import dynamic from 'next/dynamic'
import React from 'react'

const _NoSSR = (props: {children: React.ReactNode}) => (
  <React.Fragment>{props.children}</React.Fragment>
)

export const NoSSR = dynamic(() => Promise.resolve(_NoSSR), {
  ssr: false,
})
