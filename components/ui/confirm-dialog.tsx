'use client'

import {
  useState,
  useCallback,
  createContext,
  useContext,
  ReactNode,
} from 'react'

interface ConfirmOptions {
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'primary'
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextType | null>(null)

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider')
  }
  return context.confirm
}

interface ConfirmProviderProps {
  children: ReactNode
}

export function ConfirmProvider({ children }: ConfirmProviderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const [resolveRef, setResolveRef] = useState<
    ((value: boolean) => void) | null
  >(null)

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setOptions(opts)
      setResolveRef(() => resolve)
      setIsOpen(true)
    })
  }, [])

  const handleConfirm = () => {
    resolveRef?.(true)
    setIsOpen(false)
    setOptions(null)
    setResolveRef(null)
  }

  const handleCancel = () => {
    resolveRef?.(false)
    setIsOpen(false)
    setOptions(null)
    setResolveRef(null)
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {isOpen && options && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-brutal-black/50"
          onClick={handleCancel}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
        >
          <div
            className="mx-4 w-full max-w-md border-3 border-brutal-black bg-brutal-white p-6 shadow-brutal-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="confirm-title"
              className="mb-2 text-lg font-bold text-brutal-black"
            >
              {options.title}
            </h2>
            {options.description && (
              <p className="mb-6 text-sm text-brutal-black/80">
                {options.description}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className="cursor-pointer border-2 border-brutal-black bg-brutal-white px-4 py-2 font-bold text-brutal-black shadow-brutal-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal"
                aria-label={options.cancelText || '취소'}
              >
                {options.cancelText || '취소'}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className={`cursor-pointer border-2 border-brutal-black px-4 py-2 font-bold text-brutal-black shadow-brutal-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal ${
                  options.variant === 'danger'
                    ? 'bg-brutal-pink'
                    : 'bg-brutal-yellow'
                }`}
                aria-label={options.confirmText || '확인'}
              >
                {options.confirmText || '확인'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}
