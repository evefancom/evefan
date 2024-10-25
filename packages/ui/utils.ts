import type {ClassValue} from 'clsx'
import {clsx} from 'clsx'
import React from 'react'
import {twMerge} from 'tailwind-merge'

/** https://ui.shadcn.com/docs/installation */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getValidChildren(children: React.ReactNode) {
  return React.Children.toArray(children).filter((child) =>
    React.isValidElement(child),
  ) as React.ReactElement[]
}
