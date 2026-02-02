import * as React from 'react'
import { cn } from '@/lib/utils/cn'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center border-2 border-brutal-black font-bold',
          'transition-all duration-150 ease-in-out',
          'shadow-brutal hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-hover',
          'active:translate-x-0.5 active:translate-y-0.5 active:shadow-brutal-active',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-black',
          'disabled:pointer-events-none disabled:translate-x-0 disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none',
          {
            'bg-brutal-yellow text-brutal-black hover:bg-yellow-300':
              variant === 'primary',
            'bg-brutal-white text-brutal-black hover:bg-gray-100':
              variant === 'secondary',
            'bg-transparent text-brutal-black hover:bg-brutal-yellow':
              variant === 'outline',
            'border-transparent shadow-none hover:translate-x-0 hover:translate-y-0 hover:bg-gray-100 hover:shadow-none':
              variant === 'ghost',
            'bg-brutal-red text-brutal-white hover:bg-red-400':
              variant === 'danger',
            'px-3 py-1.5 text-xs': size === 'sm',
            'px-4 py-2 text-sm': size === 'md',
            'px-6 py-3 text-base': size === 'lg',
          },
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button }
