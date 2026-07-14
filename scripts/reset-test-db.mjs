#!/usr/bin/env node
// ============================================================================
// scripts/reset-test-db.mjs — Reset habit_tracker_test database before vitest runs.
// This script drops all tables and recreates them via raw SQL so tests always
// start with a clean database (fresh sequences, no stale data from previous runs).
// Uses docker cp + psql -f to avoid shell escaping issues on Windows.
// ============================================================================

import { execSync } from 'child_process';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

const sqlSchema = `DROP TABLE IF EXISTS habit_completions CASCADE;
DROP TABLE IF EXISTS habits CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

CREATE TABLE profiles (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '👤',
  target_points INTEGER DEFAULT 10,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  archived_at TIMESTAMP
);

CREATE TABLE habits (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  text TEXT NOT NULL,
  emoji TEXT DEFAULT '🎯',
  points INTEGER DEFAULT 1 NOT NULL,
  display_order INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  archived_at TIMESTAMP
);

CREATE TABLE habit_completions (
  id SERIAL PRIMARY KEY,
  habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE RESTRICT,
  profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  completed_date TEXT NOT NULL,
  completed_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX completions_habit_date_unique ON habit_completions (habit_id, completed_date);
CREATE INDEX habits_profile_idx ON habits (profile_id);
CREATE INDEX profiles_archived_idx ON profiles (archived_at);
CREATE INDEX habits_archived_idx ON habits (archived_at);

ALTER SEQUENCE profiles_id_seq RESTART WITH 1;
ALTER SEQUENCE habits_id_seq RESTART WITH 1;
ALTER SEQUENCE habit_completions_id_seq RESTART WITH 1;`;

console.log('🧹 Resetting test database (habit_tracker_test)...');

try {
  console.log('  Dropping and recreating schema...');

  // Create temp dir with SQL file
  const tmpDir = fs.mkdtempSync(join(os.tmpdir(), 'habit-tracker-reset-'));
  const sqlPath = join(tmpDir, 'schema.sql');
  fs.writeFileSync(sqlPath, sqlSchema);

  // Copy SQL into container and execute via psql -f
  const containerSqlPath = '/tmp/habit-tracker-reset.sql';
  
  // Step 1: Copy file into container
  execSync(`docker cp "${sqlPath}" habit-tracker-dev:${containerSqlPath}`, {
    cwd: rootDir,
    stdio: 'inherit'
  });

  // Step 2: Execute SQL inside container
  execSync(`docker exec habit-tracker-dev psql -U postgres -d habit_tracker_test -f ${containerSqlPath}`, {
    cwd: rootDir,
    stdio: 'inherit'
  });

  // Step 3: Clean up temp file in container
  execSync(`docker exec habit-tracker-dev rm -f ${containerSqlPath}`, {
    cwd: rootDir,
    stdio: 'inherit'
  });

  // Clean up local temp dir
  fs.rmSync(tmpDir, { recursive: true, force: true });

  console.log('✅ Test database reset complete.\n');
} catch (err) {
  console.error('❌ Failed to reset test database:', err.message);
  process.exit(1);
}