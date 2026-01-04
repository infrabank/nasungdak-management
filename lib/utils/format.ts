import { format as dateFnsFormat } from 'date-fns'
import { ko } from 'date-fns/locale'

/**
 * Format number as Korean Won currency
 * @example formatCurrency(15000) => "₩15,000"
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format date with Korean locale
 * @example formatDate(new Date(), 'yyyy-MM-dd') => "2026-01-04"
 */
export function formatDate(date: Date | string, formatStr: string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateFnsFormat(dateObj, formatStr, { locale: ko })
}

/**
 * Format percentage
 * @example formatPercentage(0.4) => "40.0%"
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`
}
