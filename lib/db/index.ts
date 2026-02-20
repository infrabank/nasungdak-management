import { drizzle } from 'drizzle-orm/vercel-postgres'
import { sql } from '@vercel/postgres'
import * as schema from './schema'
import { logger, errorToContext } from '@/lib/logger'

void errorToContext

// Check for required environment variable
if (!process.env.POSTGRES_URL) {
  logger.error(
    'ERROR: POSTGRES_URL environment variable is not set.\n' +
      'Please add it in Vercel Dashboard > Settings > Environment Variables\n' +
      'Or create a Vercel Postgres database in Storage tab.'
  )
}

export const db = drizzle(sql, { schema })

export * from './schema'
