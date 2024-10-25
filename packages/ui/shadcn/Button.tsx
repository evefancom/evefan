import type {VariantProps} from 'class-variance-authority'
import {cva} from 'class-variance-authority'
import React from 'react'
import {cn} from '../utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background',
  {
    variants: {
      variant: {
        default:
          'text-button-foreground bg-button hover:bg-button-hover border-button-stroke border',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline:
          'border border-input hover:bg-accent hover:text-accent-foreground',
        secondary:
          'bg-button-secondary text-secondary-foreground hover:bg-button-secondary-hover border-button-secondary-stroke border',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'underline-offset-4 hover:underline text-primary',
      },
      size: {
        default: 'h-10 py-2 px-4',
        sm: 'h-8 px-4 rounded-md',
        lg: 'h-12 px-10 rounded-md',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({className, variant, size, ...props}, ref) => (
    <button
      className={cn(buttonVariants({variant, size, className}))}
      ref={ref}
      {...props}
    />
  ),
)
Button.displayName = 'Button'

export {Button, buttonVariants}
