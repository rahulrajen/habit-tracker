import { defineConfig } from 'vitest/config';
import path from 'path';

// Load .env.test BEFORE any test files or their imports are evaluated.
// This is critical: @core/db.ts creates a Pool from process.env.DATABASE_URL at module-load time.
// Without this, the Pool connects to dev DB (habit_tracker) instead of habit_tracker_test,
// causing FK violations when tests try to insert habits referencing profiles that don't exist in the test DB.
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    include: ['**/*.test.ts', '**/*.test.tsx'],
    setupFiles: ['./src/vitest.setup.ts'],
    globals: true,
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, './src/core'),
      '@modules/profiles': path.resolve(__dirname, './src/modules/profiles'),
      '@modules/habits': path.resolve(__dirname, './src/modules/habits'),
    },
  },
});