// ============================================================================
// Vitest setup — load environment variables from .env.local before tests run,
// then override DATABASE_URL → TEST_DATABASE_URL so actions layer uses test DB.
// Vitest does not auto-load .env files, so we do this manually here.
// IMPORTANT: This runs BEFORE any test file imports, so the override takes effect
// before @core/db.ts caches process.env.DATABASE_URL into its Pool instance.
// ============================================================================

import { config } from 'dotenv';

config({ path: '.env.local' });

// Override DATABASE_URL to point at the test database so that @core/db
// (and any action function imported by tests) talks to TEST_DATABASE_URL instead.
if (process.env.TEST_DATABASE_URL && !process.env.DATABASE_URL?.includes('habit_tracker_test')) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}