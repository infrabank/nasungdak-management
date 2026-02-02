import { drizzle } from 'drizzle-orm/vercel-postgres'
import { sql } from '@vercel/postgres'
import * as schema from './schema'

// Check for required environment variable
if (!process.env.POSTGRES_URL) {
  console.error(
    'ERROR: POSTGRES_URL environment variable is not set.\n' +
      'Please add it in Vercel Dashboard > Settings > Environment Variables\n' +
      'Or create a Vercel Postgres database in Storage tab.'
  )
}

export const db = drizzle(sql, { schema })

export * from './schema'
