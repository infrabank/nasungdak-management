import * as React from 'react'
import { cn } from '@/lib/utils/cn'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <div className="relative">
          <select
            className={cn(
              'block w-full py-3 px-4 pr-10 text-base font-medium text-brutal-black bg-brutal-white',
              'border-2 border-brutal-black shadow-brutal-sm',
              'focus:outline-none focus:shadow-brutal focus:-translate-x-0.5 focus:-translate-y-0.5',
              'transition-all duration-150 ease-in-out',
              'disabled:cursor-not-allowed disabled:bg-brutal-black/10 disabled:text-brutal-black/50 disabled:shadow-none',
              'cursor-pointer appearance-none',
              error && 'border-brutal-red focus:border-brutal-red',
              className
            )}
            ref={ref}
            {...props}
          >
            {children}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
            <svg
              className="h-5 w-5 text-brutal-black"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
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
