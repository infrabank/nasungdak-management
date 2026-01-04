import { clsx, type ClassValue } from 'clsx'

/**
 * Merge Tailwind CSS classes
 * Useful for conditional styling
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}
