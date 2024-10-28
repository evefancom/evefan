import type {Config} from 'tailwindcss'
import defaultTheme from 'tailwindcss/defaultTheme'
import {VeniceTheme} from './themes'

export default {
  darkMode: 'class',
  content: [
    // No styles in here, be very careful about including extra
    // paths here we don't need otherwise it causes massive DX perf issues
    // where it takes 60 seconds to compile a one line hello world change
    // '../../integrations/**/*.tsx',

    '../../packages/engine-frontend/**/*.tsx',
    '!../../packages/engine-frontend/node_modules',
    '../../packages/ui/**/*.tsx',
    '!../../packages/ui/node_modules',
    './app/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}',

    // Path to the tremor module
    './node_modules/@tremor/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      keyframes: {
        // Dropdown menu
        'scale-in': {
          '0%': {opacity: '0', transform: 'scale(0)'},
          '100%': {opacity: '1', transform: 'scale(1)'},
        },
        'slide-down': {
          '0%': {opacity: '0', transform: 'translateY(-10px)'},
          '100%': {opacity: '1', transform: 'translateY(0)'},
        },
        'slide-up': {
          '0%': {opacity: '0', transform: 'translateY(10px)'},
          '100%': {opacity: '1', transform: 'translateY(0)'},
        },
        // Toast
        'toast-hide': {
          '0%': {opacity: '1'},
          '100%': {opacity: '0'},
        },
        'toast-slide-in-right': {
          '0%': {transform: 'translateX(calc(100% + 1rem))'},
          '100%': {transform: 'translateX(0)'},
        },
        'toast-slide-in-bottom': {
          '0%': {transform: 'translateY(calc(100% + 1rem))'},
          '100%': {transform: 'translateY(0)'},
        },
        'toast-swipe-out': {
          '0%': {transform: 'translateX(var(--radix-toast-swipe-end-x))'},
          '100%': {
            transform: 'translateX(calc(100% + 1rem))',
          },
        },
      },
      animation: {
        // Dropdown menu
        'scale-in': 'scale-in 0.2s ease-in-out',
        'slide-down': 'slide-down 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        // Toast
        'toast-hide': 'toast-hide 100ms ease-in forwards',
        'toast-slide-in-right':
          'toast-slide-in-right 150ms cubic-bezier(0.16, 1, 0.3, 1)',
        'toast-slide-in-bottom':
          'toast-slide-in-bottom 150ms cubic-bezier(0.16, 1, 0.3, 1)',
        'toast-swipe-out': 'toast-swipe-out 100ms ease-out forwards',
      },
      backgroundColor: {
        'venice-red-btn': 'salmon',
        'venice-green-btn': VeniceTheme.green.darkened,
      },
      boxShadow: {
        'venice-green-glow': `0px 0px 8px 4px ${VeniceTheme.greenGlow}`,
        'venice-black-drop-shadow': `0px 2px 4px 0px ${VeniceTheme.dropShadow}`,
      },
      colors: {
        // --- Begin shadcn tailwind config
        border: 'hsl(var(--border))',
        button: {
          DEFAULT: 'var(--button)',
          foreground: 'var(--button-foreground)',
          hover: 'var(--button-hover)',
          stroke: 'var(--button-stroke)',
        },
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // --- End shadcn tailwind config
        // ...VeniceTheme, // Needs to be commented out for tremor to work...
        'venice-black': VeniceTheme.black,
        'venice-gold': VeniceTheme.gold,
        'venice-gray-muted': VeniceTheme.gray,
        'venice-green': VeniceTheme.green,
        'venice-red': VeniceTheme.red,
      },
      current: 'currentColor',
      fontFamily: {
        sans: ['Montserrat', ...defaultTheme.fontFamily.sans],
        mono: ['Source Code Pro', ...defaultTheme.fontFamily.mono],
      },
      textColor: {
        'venice-gray': '#c0c0c0',
      },
      transparent: 'transparent',
    },
  },
  plugins: [require('tailwindcss-animate'), require('tailwindcss-radix')()],
} satisfies Config
