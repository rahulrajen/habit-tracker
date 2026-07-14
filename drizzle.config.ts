// ============================================================================
// Drizzle ORM — migration & schema generation config
// Uses DATABASE_URL from .env.local (dev DB) for all local operations
// At go-live, same migrations run against Neon via direct connection string
// ============================================================================

import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: [
    './src/core/schema.ts', // core profiles table
    './src/modules/habits/schema.ts', // habits + habit_completions tables
  ],
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});