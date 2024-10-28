'use client'

import {Check, Copy, Eye, EyeOff} from 'lucide-react'
import {useState} from 'react'
import {useToast} from '../shadcn'
import {Button} from '../shadcn/Button'
import type {InputProps} from '../shadcn/Input'
import {Input} from '../shadcn/Input'
import {Label} from '../shadcn/Label'

interface SecureInputProps {
  label?: string
  placeholder?: string
}
interface SecureInputProps extends Omit<InputProps, 'type'> {
  label?: string
}

export default function SecureInput({
  label = 'Secure Input',
  placeholder = 'Enter secure text',
  value,
  onChange,
  ...props
}: SecureInputProps) {
  const [showValue, setShowValue] = useState(false)
  const [copied, setCopied] = useState(false)
  const {toast} = useToast()

  const toggleValueVisibility = () => {
    setShowValue(!showValue)
  }

  const copyToClipboard = async () => {
    if (typeof value !== 'string' || value.trim() === '') {
      toast({
        title: 'Nothing to copy',
        description: 'The input field is empty.',
        variant: 'destructive',
      })
      return
    }

    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      toast({
        title: 'Copied to clipboard',
        description: 'The text has been copied to your clipboard.',
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast({
        title: 'Failed to copy',
        description: 'There was an error copying the text to your clipboard.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="w-full max-w-sm space-y-2">
      <Label htmlFor="secureInput">{label}</Label>
      <div className="flex">
        <div className="relative flex-grow">
          <Input
            {...props}
            type={showValue ? 'text' : 'password'}
            id="secureInput"
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            className="pr-20"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={toggleValueVisibility}
            aria-label={showValue ? 'Hide value' : 'Show value'}>
            {showValue ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="ml-2"
          onClick={copyToClipboard}
          aria-label="Copy to clipboard">
          {copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  )
}
