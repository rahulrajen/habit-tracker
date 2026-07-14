import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

// Prefer TEST_DATABASE_URL unconditionally when present — it covers vitest (which sets NODE_ENV=test),
// manual `NODE_ENV=test npx vitest`, and any future runner.  DATABASE_URL is the fallback for
// Next.js runtime (dev, build, production) where no test DB exists.
const conn = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

if (!conn) {
  throw new Error('Missing DATABASE_URL and TEST_DATABASE_URL — cannot create database pool');
}

const pool = new pg.Pool({
  connectionString: conn,
});

export const db = drizzle(pool);

// Graceful shutdown for serverless environments (Netlify Functions)
export async function closeDB() {
  await pool.end();
}