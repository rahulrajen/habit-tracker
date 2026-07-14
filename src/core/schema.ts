// ============================================================================
// Core Schema — ONLY contains `profiles` (the one thing both modules need)
// The habits module owns its own tables in src/modules/habits/schema.ts
// ============================================================================

import { pgTable, text, integer, timestamp, index } from 'drizzle-orm/pg-core';

/**
 * Core-owned profiles table.
 * - `target_points` is used by the habits module (read-only) for progress bar.
 * - Only the profiles module writes to this table.
 * - Soft-delete via `archived_at`, never a row DELETE.
 */
export const profiles = pgTable(
  'profiles',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    name: text('name').notNull(),
    emoji: text('emoji').default('\u{1F464}'),
    target_points: integer('target_points').default(10),
    created_at: timestamp('created_at').defaultNow().notNull(),
    archived_at: timestamp('archived_at'), // NULL = active, non-NULL = archived (soft-delete)
  },
  (t) => ({
    profilesArchivedIdx: index('profiles_archived_idx').on(t.archived_at),
  })
);

// Export for Drizzle migration generation
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;