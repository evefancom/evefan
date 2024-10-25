'use client'

import {useState} from 'react'

interface ThemeColors {
  background: string
  border: string
  button: string
  buttonForeground: string
  foreground: string
  primary: string
  primaryForeground: string
  secondary: string
  secondaryForeground: string
  card: string
  cardForeground: string
}

const defaultThemeColors: Partial<ThemeColors> = {
  background: '0 0% 100%',
  border: '214.3 31.8% 91.4%',
  card: '0 0% 100%',
  cardForeground: '192 5.32% 31.57%',
  foreground: '192 5.32% 31.57%',
  primary: '222.2 47.4% 11.2%',
  primaryForeground: '210 40% 98%',
  secondary: '210 40% 96.1%',
  secondaryForeground: '222.2 47.4% 11.2%',
}

export function ColorConfig() {
  const [themeColors] = useState<Partial<ThemeColors>>(defaultThemeColors)
  // TODO: Fetch color config by client if required and update themeColors state.

  return (
    <style id="theme-colors" jsx global>{`
      :root {
        --color-primary: ${themeColors.primary};
        --color-secondary: ${themeColors.secondary};
        --color-background: ${themeColors.background};
        --color-foreground: ${themeColors.foreground};
        --color-border: ${themeColors.border};
        --color-input: ${themeColors.foreground};
        --color-ring: ${themeColors.secondary};
        --color-primary-foreground: ${themeColors.primaryForeground};
        --color-secondary-foreground: ${themeColors.secondaryForeground};
        --card: ${themeColors.card};
        --card-foreground: ${themeColors.cardForeground};
      }
    `}</style>
  )
}
