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
          'mb-2 block text-sm font-bold text-brutal-black',
          className
        )}
        {...props}
      >
        {children}
        {required && <span className="ml-1 text-brutal-red">*</span>}
      </label>
    )
  }
)
Label.displayName = 'Label'

export { Label }
