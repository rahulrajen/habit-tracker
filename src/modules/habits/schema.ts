// ============================================================================
// Habits Module — Database Schema
// Owns `habits` and `habit_completions` tables. Neither is core-owned.
// ============================================================================

import { pgTable, integer, text, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { profiles } from '@core/schema';

/**
 * Habits table — one row per active habit per profile.
 * - `display_order` controls sort order in the UI (ascending).
 * - Soft-delete via `archived_at`, never a row DELETE.
 * - Foreign key to profiles ON DELETE RESTRICT (soft-delete is the only path).
 */
export const habits = pgTable(
  'habits',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    profile_id: integer('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'restrict' }),
    text: text('text').notNull(),
    emoji: text('emoji').default('\u{1F3AF}'),
    points: integer('points').notNull().default(1),
    display_order: integer('display_order').notNull().default(0),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
    archived_at: timestamp('archived_at'), // NULL = active, non-NULL = archived (soft-delete)
  },
  (t) => ({
    habitsProfileIdx: index('habits_profile_idx').on(t.profile_id),
    habitsArchivedIdx: index('habits_archived_idx').on(t.archived_at),
  })
);

/**
 * Completions log — one row per (habit, calendar day) the habit was completed.
 * - `completed_date` is always computed server-side in IST (UTC+5:30).
 * - Unique constraint prevents double-counting.
 * - Foreign keys ON DELETE RESTRICT to prevent orphaning or history loss.
 */
export const habitCompletions = pgTable(
  'habit_completions',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    habit_id: integer('habit_id')
      .notNull()
      .references(() => habits.id, { onDelete: 'restrict' }),
    profile_id: integer('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'restrict' }),
    completed_date: text('completed_date').notNull(), // YYYY-MM-DD in IST (server-computed)
    completed_at: timestamp('completed_at').defaultNow().notNull(),
  },
  (t) => ({
    completionsHabitDateUnique: uniqueIndex('completions_habit_date_unique').on(t.habit_id, t.completed_date),
    completionsProfileIdx: index('completions_profile_idx').on(t.profile_id),
  })
);

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------

export type Habit = typeof habits.$inferSelect;
export type NewHabit = typeof habits.$inferInsert;
export type HabitCompletion = typeof habitCompletions.$inferSelect;
export type NewHabitCompletion = typeof habitCompletions.$inferInsert;