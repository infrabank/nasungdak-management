import { isNull, and, SQL } from 'drizzle-orm'
import { PgColumn } from 'drizzle-orm/pg-core'

/**
 * Helper to add soft delete filter to queries.
 * Use this to ensure deleted records are always filtered out.
 *
 * @example
 * // In a where clause:
 * where: withSoftDelete(table.deletedAt, eq(table.id, id))
 *
 * // Multiple conditions:
 * where: withSoftDelete(table.deletedAt, eq(table.id, id), eq(table.status, 'active'))
 */
export function withSoftDelete<T extends PgColumn>(
  deletedAtColumn: T,
  ...conditions: (SQL | undefined)[]
): SQL {
  const validConditions = conditions.filter((c): c is SQL => c !== undefined)
  return and(isNull(deletedAtColumn), ...validConditions) as SQL
}

/**
 * Helper to create a soft delete filter for a specific table's deletedAt column.
 * Returns a function that can be used repeatedly.
 *
 * @example
 * const notDeleted = softDeleteFilter(users.deletedAt)
 * where: notDeleted(eq(users.id, id))
 */
export function softDeleteFilter<T extends PgColumn>(deletedAtColumn: T) {
  return (...conditions: (SQL | undefined)[]): SQL => {
    return withSoftDelete(deletedAtColumn, ...conditions)
  }
}
