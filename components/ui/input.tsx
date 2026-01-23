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
            'block w-full py-2 px-3 text-brutal-black bg-brutal-white',
            'border-2 border-brutal-black shadow-brutal-sm',
            'placeholder:text-brutal-black/50',
            'focus:outline-none focus:shadow-brutal focus:-translate-x-0.5 focus:-translate-y-0.5',
            'transition-all duration-150 ease-in-out',
            'disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-brutal-black/50 disabled:shadow-none',
            'sm:text-sm font-medium',
            error && 'border-brutal-red focus:border-brutal-red',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-2 text-sm font-bold text-brutal-red border-l-2 border-brutal-red pl-2">
            {error}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }
