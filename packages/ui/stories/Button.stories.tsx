import {fn} from '@storybook/test'
import {Button} from '../shadcn/Button'

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
export default {
  title: 'Example/Button',
  component: Button,
  parameters: {
    // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/configure/story-layout
    layout: 'centered',
  },
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ['autodocs'],
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
  argTypes: {
    backgroundColor: {control: 'color'},
  },
  // Use `fn` to spy on the onClick arg, which will appear in the actions panel once invoked: https://storybook.js.org/docs/essentials/actions#action-args
  args: {onClick: fn()},
}

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Default = {
  args: {
    'aria-label': 'Copy to clipboard',
    variant: 'default',
    size: 'default',
  },
}
export const Primary = {
  args: {
    'aria-label': 'Copy to clipboard',
    variant: 'primary',
    size: 'default',
  },
}
export const Secondary = {
  args: {
    'aria-label': 'Copy to clipboard',
    variant: 'secondary',
    size: 'default',
  },
}
