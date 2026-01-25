'use client'

import { Toaster as SonnerToaster, toast as sonnerToast } from 'sonner'

export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'flex items-center gap-3 w-full max-w-md p-4 border-3 border-brutal-black shadow-brutal bg-brutal-white',
          title: 'font-bold text-brutal-black',
          description: 'text-sm text-brutal-black/80',
          success: 'bg-brutal-green',
          error: 'bg-brutal-pink',
          warning: 'bg-brutal-orange',
          info: 'bg-brutal-blue',
        },
      }}
    />
  )
}

export const toast = {
  success: (message: string) => {
    sonnerToast.success(message, {
      className: 'bg-brutal-green',
    })
  },
  error: (message: string) => {
    sonnerToast.error(message, {
      className: 'bg-brutal-pink',
    })
  },
  warning: (message: string) => {
    sonnerToast.warning(message, {
      className: 'bg-brutal-orange',
    })
  },
  info: (message: string) => {
    sonnerToast.info(message, {
      className: 'bg-brutal-blue',
    })
  },
  message: (message: string) => {
    sonnerToast(message)
  },
}
