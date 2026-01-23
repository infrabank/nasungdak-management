import * as React from 'react'
import { cn } from '@/lib/utils/cn'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <select
          className={cn(
            'block w-full py-2 px-3 text-brutal-black bg-brutal-white',
            'border-2 border-brutal-black shadow-brutal-sm',
            'focus:outline-none focus:shadow-brutal focus:-translate-x-0.5 focus:-translate-y-0.5',
            'transition-all duration-150 ease-in-out',
            'disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-brutal-black/50 disabled:shadow-none',
            'sm:text-sm font-medium',
            'cursor-pointer',
            error && 'border-brutal-red focus:border-brutal-red',
            className
          )}
          ref={ref}
          {...props}
        >
          {children}
        </select>
        {error && (
          <p className="mt-2 text-sm font-bold text-brutal-red border-l-2 border-brutal-red pl-2">
            {error}
          </p>
        )}
      </div>
    )
  }
)
Select.displayName = 'Select'

export { Select }
