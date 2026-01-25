import * as React from 'react'
import { cn } from '@/lib/utils/cn'

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, children, required, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          'block text-sm font-bold text-brutal-black mb-2',
          className
        )}
        {...props}
      >
        {children}
        {required && <span className="text-brutal-red ml-1">*</span>}
      </label>
    )
  }
)
Label.displayName = 'Label'

export { Label }
