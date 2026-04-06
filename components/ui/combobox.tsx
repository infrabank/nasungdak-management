'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils/cn'

export interface ComboboxOption {
  value: string
  label: string
  sublabel?: string
}

interface ComboboxProps {
  options: ComboboxOption[]
  recentOptions?: ComboboxOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  className?: string
  id?: string
}

export function Combobox({
  options,
  recentOptions,
  value,
  onChange,
  placeholder = '검색하세요',
  required,
  disabled,
  className,
  id,
}: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const selectedOption = useMemo(
    () => options.find((o) => o.value === value),
    [options, value]
  )

  const filteredOptions = useMemo(() => {
    if (!query.trim()) return options
    const lower = query.toLowerCase()
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(lower) ||
        o.sublabel?.toLowerCase().includes(lower)
    )
  }, [options, query])

  const filteredRecent = useMemo(() => {
    if (!recentOptions || recentOptions.length === 0) return []
    if (!query.trim()) return recentOptions
    const lower = query.toLowerCase()
    return recentOptions.filter(
      (o) =>
        o.label.toLowerCase().includes(lower) ||
        o.sublabel?.toLowerCase().includes(lower)
    )
  }, [recentOptions, query])

  const allItems = useMemo(() => {
    const recentIds = new Set(filteredRecent.map((r) => r.value))
    const rest = filteredOptions.filter((o) => !recentIds.has(o.value))
    return [...filteredRecent, ...rest]
  }, [filteredRecent, filteredOptions])

  const handleSelect = useCallback(
    (optionValue: string) => {
      onChange(optionValue)
      setQuery('')
      setIsOpen(false)
      setHighlightIndex(-1)
    },
    [onChange]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === 'ArrowDown' || e.key === 'Enter') {
          e.preventDefault()
          setIsOpen(true)
        }
        return
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setHighlightIndex((prev) =>
            prev < allItems.length - 1 ? prev + 1 : 0
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setHighlightIndex((prev) =>
            prev > 0 ? prev - 1 : allItems.length - 1
          )
          break
        case 'Enter':
          e.preventDefault()
          if (highlightIndex >= 0 && highlightIndex < allItems.length) {
            handleSelect(allItems[highlightIndex].value)
          }
          break
        case 'Escape':
          e.preventDefault()
          setIsOpen(false)
          setHighlightIndex(-1)
          break
      }
    },
    [isOpen, highlightIndex, allItems, handleSelect]
  )

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-combobox-item]')
      items[highlightIndex]?.scrollIntoView({ block: 'nearest' })
    }
  }, [highlightIndex])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
        setHighlightIndex(-1)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {/* Hidden input for form required validation */}
      {required && (
        <input
          type="text"
          required
          value={value}
          onChange={() => {}}
          className="absolute h-0 w-0 opacity-0"
          tabIndex={-1}
          aria-hidden="true"
        />
      )}

      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => {
          setIsOpen(!isOpen)
          if (!isOpen) {
            setQuery('')
            setHighlightIndex(-1)
            requestAnimationFrame(() => inputRef.current?.focus())
          }
        }}
        className={cn(
          'flex w-full items-center justify-between bg-brutal-white px-4 py-3 text-left text-base font-medium',
          'border-2 border-brutal-black shadow-brutal-sm',
          'transition-all duration-150 ease-in-out',
          'disabled:cursor-not-allowed disabled:bg-brutal-black/10 disabled:text-brutal-black/50',
          isOpen && '-translate-x-0.5 -translate-y-0.5 shadow-brutal'
        )}
        role="combobox"
        aria-expanded={isOpen}
        aria-controls="combobox-listbox"
        aria-haspopup="listbox"
      >
        <span
          className={cn(
            selectedOption
              ? 'text-brutal-black'
              : 'text-brutal-black/50'
          )}
        >
          {selectedOption
            ? `${selectedOption.label}${selectedOption.sublabel ? ` (${selectedOption.sublabel})` : ''}`
            : placeholder}
        </span>
        <svg
          className={cn(
            'h-5 w-5 shrink-0 text-brutal-black transition-transform',
            isOpen && 'rotate-180'
          )}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-30 mt-1 w-full border-2 border-brutal-black bg-brutal-white shadow-brutal">
          {/* Search input */}
          <div className="border-b-2 border-brutal-black p-2">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setHighlightIndex(-1)
              }}
              onKeyDown={handleKeyDown}
              placeholder="검색..."
              className="w-full border-2 border-brutal-black bg-brutal-white px-3 py-2 text-sm font-medium text-brutal-black placeholder:text-brutal-black/40 focus:outline-none"
              role="searchbox"
              aria-label="옵션 검색"
            />
          </div>

          {/* Options list */}
          <div
            ref={listRef}
            className="max-h-60 overflow-y-auto"
            id="combobox-listbox"
            role="listbox"
          >
            {allItems.length === 0 ? (
              <div className="px-4 py-3 text-center text-sm font-medium text-brutal-black/50">
                검색 결과가 없습니다
              </div>
            ) : (
              <>
                {filteredRecent.length > 0 && (
                  <div className="border-b border-brutal-black/20 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-brutal-black/50">
                    최근 사용
                  </div>
                )}
                {filteredRecent.map((option, idx) => (
                  <button
                    key={`recent-${option.value}`}
                    type="button"
                    data-combobox-item
                    role="option"
                    aria-selected={option.value === value}
                    className={cn(
                      'flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-brutal-black',
                      highlightIndex === idx && 'bg-brutal-blue/30',
                      option.value === value && 'bg-brutal-yellow/40 font-bold'
                    )}
                    onMouseEnter={() => setHighlightIndex(idx)}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      handleSelect(option.value)
                    }}
                  >
                    <span className="flex-1">{option.label}</span>
                    {option.sublabel && (
                      <span className="text-xs text-brutal-black/50">
                        {option.sublabel}
                      </span>
                    )}
                  </button>
                ))}
                {filteredRecent.length > 0 &&
                  filteredOptions.filter(
                    (o) => !filteredRecent.some((r) => r.value === o.value)
                  ).length > 0 && (
                    <div className="border-b border-brutal-black/20 border-t px-3 py-1.5 text-xs font-black uppercase tracking-wide text-brutal-black/50">
                      전체
                    </div>
                  )}
                {filteredOptions
                  .filter(
                    (o) => !filteredRecent.some((r) => r.value === o.value)
                  )
                  .map((option, idx) => {
                    const actualIdx = filteredRecent.length + idx
                    return (
                      <button
                        key={option.value}
                        type="button"
                        data-combobox-item
                        role="option"
                        aria-selected={option.value === value}
                        className={cn(
                          'flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-brutal-black',
                          highlightIndex === actualIdx && 'bg-brutal-blue/30',
                          option.value === value &&
                            'bg-brutal-yellow/40 font-bold'
                        )}
                        onMouseEnter={() => setHighlightIndex(actualIdx)}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          handleSelect(option.value)
                        }}
                      >
                        <span className="flex-1">{option.label}</span>
                        {option.sublabel && (
                          <span className="text-xs text-brutal-black/50">
                            {option.sublabel}
                          </span>
                        )}
                      </button>
                    )
                  })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
