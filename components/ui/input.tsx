import * as React from 'react'
import { cn } from '@/lib/utils/cn'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          type={type}
          className={cn(
            'block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm',
            'ring-1 ring-inset ring-gray-300 placeholder:text-gray-400',
            'focus:ring-2 focus:ring-inset focus:ring-blue-600',
            'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500',
            'sm:text-sm',
            error && 'ring-red-300 focus:ring-red-600',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }
