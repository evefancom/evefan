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

export function parseCategory(category: string) {
  return category.length < 5
    ? category.toUpperCase()
    : category
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
}
