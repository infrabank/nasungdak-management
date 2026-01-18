/**
 * Parameter Normalization Utilities
 *
 * Single source of truth for handling URL/form parameters
 * between page.tsx and actions.ts layers.
 *
 * RULES:
 * - Page layer: responsible for normalization and validation
 * - Action layer: assumes parameters are already valid
 */

/**
 * Normalizes an optional parameter.
 *
 * Converts undefined, null, or empty string to undefined.
 * This ensures actions.ts receives either a valid value or undefined,
 * never an empty string that would fail the `?? 'all'` normalization.
 *
 * @param param - The parameter value from searchParams
 * @returns The original value if non-empty, otherwise undefined
 *
 * @example
 * normalizeOptionalParam(undefined) // => undefined
 * normalizeOptionalParam(null)      // => undefined
 * normalizeOptionalParam('')        // => undefined
 * normalizeOptionalParam('abc')     // => 'abc'
 */
export function normalizeOptionalParam(
  param: string | null | undefined
): string | undefined {
  if (param === undefined || param === null || param === '') {
    return undefined
  }
  return param
}

/**
 * Validates and returns a required parameter.
 *
 * Throws an error if the parameter is missing or empty.
 * Use this for parameters that must always have a value.
 *
 * @param param - The parameter value from searchParams
 * @param name - The parameter name (for error messages)
 * @returns The validated non-empty string value
 * @throws Error if param is undefined, null, or empty string
 *
 * @example
 * requireParam('2024-01-01', 'startDate') // => '2024-01-01'
 * requireParam('', 'startDate')           // throws Error
 * requireParam(undefined, 'startDate')    // throws Error
 */
export function requireParam(
  param: string | null | undefined,
  name: string
): string {
  if (param === undefined || param === null || param === '') {
    throw new Error(`Required parameter '${name}' is missing or empty`)
  }
  return param
}
