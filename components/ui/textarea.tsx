import * as React from 'react'
import { cn } from '@/lib/utils/cn'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <textarea
          className={cn(
            'block w-full bg-brutal-white px-4 py-3 text-base font-medium text-brutal-black',
            'border-2 border-brutal-black shadow-brutal-sm',
            'placeholder:text-brutal-black/50',
            'focus:-translate-x-0.5 focus:-translate-y-0.5 focus:shadow-brutal focus:outline-none',
            'transition-all duration-150 ease-in-out',
            'disabled:cursor-not-allowed disabled:bg-brutal-black/10 disabled:text-brutal-black/50 disabled:shadow-none',
            'resize-none',
            error && 'border-brutal-red focus:border-brutal-red',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-2 border-l-2 border-brutal-red pl-2 text-sm font-bold text-brutal-red">
            {error}
          </p>
        )}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'

export { Textarea }
