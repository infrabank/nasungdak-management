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
            'block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm',
            'ring-1 ring-inset ring-gray-300',
            'focus:ring-2 focus:ring-inset focus:ring-blue-600',
            'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500',
            'sm:text-sm',
            error && 'ring-red-300 focus:ring-red-600',
            className
          )}
          ref={ref}
          {...props}
        >
          {children}
        </select>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    )
  }
)
Select.displayName = 'Select'

export { Select }
