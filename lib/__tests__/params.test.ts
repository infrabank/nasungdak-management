/**
 * Contract Guard Tests for Parameter Normalization
 *
 * These tests verify the input contracts between page.tsx and actions.ts layers:
 * - Empty strings are NEVER passed to actions
 * - Optional filters resolve to undefined (not empty string)
 * - Required params throw on missing/empty values
 *
 * These guards prevent cache key pollution and ensure actions receive valid input.
 */

import { describe, it, expect } from 'vitest'
import { normalizeOptionalParam, requireParam } from '../params'

describe('normalizeOptionalParam', () => {
  it('converts undefined to undefined', () => {
    expect(normalizeOptionalParam(undefined)).toBe(undefined)
  })

  it('converts null to undefined', () => {
    expect(normalizeOptionalParam(null)).toBe(undefined)
  })

  it('converts empty string to undefined (critical: prevents cache key pollution)', () => {
    // This is the most important test - empty string from URL params
    // MUST become undefined, not reach actions as ''
    expect(normalizeOptionalParam('')).toBe(undefined)
  })

  it('passes through non-empty strings unchanged', () => {
    expect(normalizeOptionalParam('store-1')).toBe('store-1')
    expect(normalizeOptionalParam('abc')).toBe('abc')
    expect(normalizeOptionalParam('2024-01-01')).toBe('2024-01-01')
  })

  it('passes through whitespace-only strings (intentional: not trimmed)', () => {
    // We don't trim - if someone passes whitespace, that's their value
    // This is edge case awareness, not a requirement
    expect(normalizeOptionalParam('  ')).toBe('  ')
  })
})

describe('requireParam', () => {
  it('throws on undefined', () => {
    expect(() => requireParam(undefined, 'testParam')).toThrow(
      "Required parameter 'testParam' is missing or empty"
    )
  })

  it('throws on null', () => {
    expect(() => requireParam(null, 'testParam')).toThrow(
      "Required parameter 'testParam' is missing or empty"
    )
  })

  it('throws on empty string', () => {
    expect(() => requireParam('', 'startDate')).toThrow(
      "Required parameter 'startDate' is missing or empty"
    )
  })

  it('returns valid non-empty strings', () => {
    expect(requireParam('2024-01-01', 'startDate')).toBe('2024-01-01')
    expect(requireParam('store-1', 'storeId')).toBe('store-1')
  })

  it('includes param name in error message', () => {
    expect(() => requireParam('', 'myCustomParam')).toThrow('myCustomParam')
  })
})

describe('Contract Invariants', () => {
  /**
   * These tests document the contracts that pages and actions depend on.
   * Breaking these would cause subtle bugs (stale cache, wrong queries).
   */

  describe('Page to Action Contract', () => {
    it('storeId filter: empty URL param becomes undefined, not ""', () => {
      // Simulates: ?storeId= (empty param in URL)
      const urlParamValue = '' // What searchParams.storeId would be
      const normalized = normalizeOptionalParam(urlParamValue)

      // Actions use `storeId ?? 'all'` which only handles null/undefined
      // If we passed '', it would NOT trigger the ?? and would use '' as storeId
      expect(normalized).not.toBe('')
      expect(normalized).toBe(undefined)
    })

    it('menuId filter: empty URL param becomes undefined, not ""', () => {
      // Same pattern for other optional filters
      const urlParamValue = ''
      const normalized = normalizeOptionalParam(urlParamValue)

      expect(normalized).not.toBe('')
      expect(normalized).toBe(undefined)
    })
  })

  describe('Cache Key Safety', () => {
    it('normalized values never include empty strings in cache keys', () => {
      // Cache keys are built like: ['prefix', startDate, endDate, storeId]
      // Empty strings would pollute the cache key space
      const possibleUrlValues = [undefined, null, '', 'valid-id']

      possibleUrlValues.forEach((value) => {
        const normalized = normalizeOptionalParam(value)
        if (normalized !== undefined) {
          // If we have a value, it must not be empty
          expect(normalized).not.toBe('')
          expect(normalized.length).toBeGreaterThan(0)
        }
      })
    })
  })
})
