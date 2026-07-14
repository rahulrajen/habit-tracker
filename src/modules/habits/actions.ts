// ============================================================================
// Habits Module — Server Actions (CRUD + completions + reorder)
// All public API goes through these functions; API routes import from here.
// ============================================================================

import { habits, habitCompletions } from './schema';
import { profiles } from '@core/schema';
import { createNotFoundError, createLimitExceededError, createValidationError } from '@core/errors';
import { db } from '@core/db';
import { getISTDate, nowInIST } from '@core/ist-date';
import { z } from 'zod';
import { and, asc, count, eq, inArray, isNull, max, sql } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Zod Schemas — validation at every boundary
// ---------------------------------------------------------------------------

export const createHabitSchema = z.object({
  profile_id: z.number().int().positive('profile_id must be a positive integer'),
  text: z.string().min(1, 'Habit text is required').max(200, 'Text must be 200 characters or less'),
  emoji: z.string().min(1, 'Emoji is required').max(4, 'Emoji must be 4 characters or less'),
  points: z.number().int().positive('Points must be a positive integer').min(1),
});

export const updateHabitSchema = z.object({
  text: z.string().min(1).max(200).optional(),
  emoji: z.string().min(1).max(4).optional(),
  points: z.number().int().positive('Points must be a positive integer').min(1).optional(),
}).refine(
  (data) => data.text !== undefined || data.emoji !== undefined || data.points !== undefined,
  { message: 'At least one field (text, emoji, or points) must be provided' }
);

export const toggleCompletionSchema = z.object({
  habit_id: z.number().int().positive('habit_id must be a positive integer'),
});

export const reorderHabitsSchema = z.object({
  profile_id: z.number().int().positive('profile_id must be a positive integer'),
  orderedHabitIds: z.array(z.number().int().positive('Each habit_id must be a positive integer')).min(1),
});

export const historyDataSchema = z.object({
  profile_id: z.number().int().positive('profile_id must be a positive integer'),
  days_back: z.number().int().positive('days_back must be a positive integer').default(30),
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_NON_ARCHIVED_HABITS_PER_PROFILE = 60;

// ---------------------------------------------------------------------------
// Public actions
// ---------------------------------------------------------------------------

/**
 * Get all non-archived habits for a profile, with is_completed_today flag.
 * Sorted by display_order ascending (UI order).
 */
export async function getHabitsByProfile(profileId: number) {
  const istToday = getISTDate();

  // Fetch all active habits ordered by display_order
  const habitRows = await db
    .select()
    .from(habits)
    .where(and(eq(habits.profile_id, profileId), isNull(habits.archived_at)))
    .orderBy(asc(habits.display_order));

  if (habitRows.length === 0) return [];

  // Batch-fetch today's completions for these habits
  const habitIds = habitRows.map((h) => h.id);
  const completions = await db
    .select({ habit_id: habitCompletions.habit_id })
    .from(habitCompletions)
    .where(
      and(
        inArray(habitCompletions.habit_id, habitIds),
        eq(habitCompletions.completed_date, istToday)
      )
    );

  const completionSet = new Set(completions.map((c) => c.habit_id));

  return habitRows.map((h) => ({
    id: h.id,
    profile_id: h.profile_id,
    text: h.text,
    emoji: h.emoji ?? '\u{1F3AF}',
    points: h.points,
    display_order: h.display_order,
    is_completed_today: completionSet.has(h.id),
  }));
}

/**
 * Get a single habit by ID. Throws 404 if not found or archived.
 */
export async function getHabitById(habitId: number) {
  const [habit] = await db
    .select()
    .from(habits)
    .where(eq(habits.id, habitId));

  if (!habit || habit.archived_at !== null) {
    throw createNotFoundError('Habit', habitId);
  }

  return habit;
}

/**
 * Create a new habit. Enforces the 60-habit soft ceiling per profile (non-archived only).
 */
export async function createHabit(input: unknown) {
  const validated = createHabitSchema.parse(input);

  // Count non-archived habits for this profile
  const [row] = await db
    .select({ c: count() })
    .from(habits)
    .where(
      and(
        eq(habits.profile_id, validated.profile_id),
        isNull(habits.archived_at)
      )
    );

  const activeCount = row?.c ?? 0;

  if (activeCount >= MAX_NON_ARCHIVED_HABITS_PER_PROFILE) {
    throw createLimitExceededError('habit', MAX_NON_ARCHIVED_HABITS_PER_PROFILE);
  }

  // Compute next display_order: max + 1
  const [orderRow] = await db
    .select({ m: max(habits.display_order) })
    .from(habits)
    .where(eq(habits.profile_id, validated.profile_id));

  const nextOrder = (orderRow?.m ?? -1) + 1;

  const [newHabit] = await db
    .insert(habits)
    .values({
      profile_id: validated.profile_id,
      text: validated.text,
      emoji: validated.emoji,
      points: validated.points,
      display_order: nextOrder,
    })
    .returning();

  return newHabit;
}

/**
 * Update a habit's text, emoji, or points. Sets updated_at to now.
 */
export async function updateHabit(habitId: number, input: unknown) {
  const validated = updateHabitSchema.parse(input);

  // Verify habit exists and is not archived
  const [existing] = await db
    .select()
    .from(habits)
    .where(eq(habits.id, habitId));

  if (existing === undefined || existing.archived_at !== null) {
    throw createNotFoundError('Habit', habitId);
  }

  // Build update set — only include fields that are defined
  const updateSet: Record<string, unknown> = { updated_at: new Date() };
  if (validated.text !== undefined) updateSet.text = validated.text;
  if (validated.emoji !== undefined) updateSet.emoji = validated.emoji;
  if (validated.points !== undefined) updateSet.points = validated.points;

  const [updated] = await db
    .update(habits)
    .set(updateSet)
    .where(eq(habits.id, habitId))
    .returning();

  return updated;
}

/**
 * Archive a habit (soft-delete). Does NOT touch completions — history preserved.
 */
export async function archiveHabit(habitId: number) {
  // Verify habit exists and is currently active
  const [existing] = await db
    .select()
    .from(habits)
    .where(eq(habits.id, habitId));

  if (existing === undefined || existing.archived_at !== null) {
    throw createNotFoundError('Habit', habitId);
  }

  const [archived] = await db
    .update(habits)
    .set({ archived_at: new Date() })
    .where(eq(habits.id, habitId))
    .returning();

  return archived;
}

/**
 * Toggle completion for a habit on today's IST date.
 * - If no completion exists → INSERT (habit completed today)
 * - If completion exists → DELETE (habit un-completed today)
 *
 * Uses the unique constraint on [habit_id, completed_date] as the safety mechanism.
 * completed_date is ALWAYS computed server-side — never accepted from client input.
 */
export async function toggleCompletion(input: unknown) {
  const validated = toggleCompletionSchema.parse(input);

  // Verify habit exists and is not archived
  const [habit] = await db
    .select()
    .from(habits)
    .where(eq(habits.id, validated.habit_id));

  if (habit === undefined || habit.archived_at !== null) {
    throw createNotFoundError('Habit', validated.habit_id);
  }

  const istToday = getISTDate();

  // Check if a completion already exists for today
  const [existing] = await db
    .select()
    .from(habitCompletions)
    .where(
      and(
        eq(habitCompletions.habit_id, validated.habit_id),
        eq(habitCompletions.completed_date, istToday)
      )
    );

  if (existing) {
    // DELETE — un-complete the habit for today
    const [deleted] = await db
      .delete(habitCompletions)
      .where(eq(habitCompletions.id, existing.id))
      .returning();
    return deleted;
  }

  // INSERT — complete the habit for today
  // profile_id is derived from the habit row (not client input) for safety
  const [created] = await db
    .insert(habitCompletions)
    .values({
      habit_id: validated.habit_id,
      profile_id: habit.profile_id,
      completed_date: istToday,
    })
    .returning();

  return created;
}

/**
 * Reorder habits for a profile by updating display_order values.
 * Wrapped in a single atomic transaction — all-or-nothing.
 * Validates that every habit_id in the list actually belongs to profileId.
 */
export async function reorderHabits(input: unknown) {
  const validated = reorderHabitsSchema.parse(input);

  const { profile_id, orderedHabitIds } = validated;

  // Verify all provided habit_ids belong to this profile and are not archived
  const existingHabits = await db
    .select()
    .from(habits)
    .where(
      and(
        eq(habits.profile_id, profile_id),
        isNull(habits.archived_at)
      )
    );

  const existingById = new Map(existingHabits.map((h) => [h.id, h]));

  // Validate every ID in the ordered list belongs to this profile
  for (const habitId of orderedHabitIds) {
    if (!existingById.has(habitId)) {
      throw createNotFoundError('Habit', habitId);
    }
  }

  // Verify no extra IDs were provided (same count)
  if (orderedHabitIds.length !== existingHabits.length) {
    throw createValidationError(
      'orderedHabitIds',
      `Expected ${existingHabits.length} habits but received ${orderedHabitIds.length}`
    );
  }

  // Execute as a single atomic transaction
  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedHabitIds.length; i++) {
      const habitId = orderedHabitIds[i];
      await tx
        .update(habits)
        .set({ display_order: i, updated_at: new Date() })
        .where(eq(habits.id, habitId));
    }
  });

  // Return the updated habits in their new order
  return db
    .select()
    .from(habits)
    .where(eq(habits.profile_id, profile_id))
    .orderBy(asc(habits.display_order));
}

// ---------------------------------------------------------------------------
// Phase 3 additions: progress bar + history chart data
// ---------------------------------------------------------------------------

/**
 * Get daily progress for a profile.
 * Computes today's total points from completions joined against habit points.
 * Returns { current, target, percentage } with zero-target guard.
 */
export async function getDailyProgress(profileId: number) {
  const istToday = getISTDate();

  // Fetch the profile to get target_points
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, profileId));

  if (!profile) {
    throw createNotFoundError('Profile', profileId);
  }

  const target = profile.target_points ?? 0;

  // Compute today's total: SUM(habits.points) for completions on istToday
  const [row] = await db
    .select({
      current: sql<number>`COALESCE(SUM(${habits.points}), 0)`,
    })
    .from(habitCompletions)
    .innerJoin(habits, eq(habitCompletions.habit_id, habits.id))
    .where(
      and(
        eq(habitCompletions.completed_date, istToday),
        eq(habitCompletions.profile_id, profileId)
      )
    );

  const current = Number(row?.current ?? 0);
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;

  // Compute streak: number of consecutive days (including today) where target was met
  const streak = await computeStreak(profileId, target, istToday);

  return {
    current,
    target,
    percentage: Math.round(percentage),
    isTargetMet: target > 0 && current >= target,
    hasZeroTarget: target === 0,
    streak,
  };
}

/**
 * Compute consecutive days the target was met, counting backwards from today.
 */
async function computeStreak(
  profileId: number,
  target: number,
  today: string
): Promise<number> {
  if (target <= 0) return 0;

  // Get daily sums for the last 60 days, ordered descending
  const rows = await db
    .select({
      date: habitCompletions.completed_date,
      total: sql<number>`COALESCE(SUM(${habits.points}), 0)`,
    })
    .from(habitCompletions)
    .innerJoin(habits, eq(habitCompletions.habit_id, habits.id))
    .where(eq(habitCompletions.profile_id, profileId))
    .groupBy(habitCompletions.completed_date)
    .orderBy(sql`${habitCompletions.completed_date} DESC`)
    .limit(60);

  let streak = 0;
  // Build a map for fast lookup
  const pointsByDate = new Map<string, number>();
  for (const r of rows) {
    pointsByDate.set(r.date, Number(r.total));
  }

  // Walk backwards from today
  const cursor = new Date(today + 'T00:00:00');
  // Walk backwards checking consecutive days (break when target not met)
  let done = false;
  while (!done) {
    const dateStr = cursor.toISOString().split('T')[0];
    const dayPoints = pointsByDate.get(dateStr) ?? 0;
    if (dayPoints >= target) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      done = true;
    }
  }

  return streak;
}

/**
 * Get history data for a profile over the last N days.
 * Returns array of { date, points } sorted ascending by date.
 * Includes completions from archived habits (history preserved).
 */
export async function getHistoryData(input: unknown) {
  const validated = historyDataSchema.parse(input);

  const { profile_id, days_back } = validated;

  // Compute the start date using IST (not UTC) to match completed_date storage
  const istNow = nowInIST();
  const startDate = new Date(istNow.getTime() - days_back * 24 * 60 * 60 * 1000);
  const startDateStr = startDate.toISOString().split('T')[0];

  // Query: aggregate points per day, grouped by completed_date
  const rows = await db
    .select({
      date: habitCompletions.completed_date,
      points: sql<number>`COALESCE(SUM(${habits.points}), 0)`,
    })
    .from(habitCompletions)
    .innerJoin(habits, eq(habitCompletions.habit_id, habits.id))
    .where(
      and(
        eq(habitCompletions.profile_id, profile_id),
        sql`${habitCompletions.completed_date} >= ${startDateStr}`
      )
    )
    .groupBy(habitCompletions.completed_date)
    .orderBy(asc(habitCompletions.completed_date));

  // Fill in zero-point days for any missing dates in the range
  const result: Array<{ date: string; points: number }> = [];
  let cursor = new Date(startDate);
  const endDate = new Date();

  while (cursor <= endDate) {
    const dateStr = cursor.toISOString().split('T')[0];
    const existing = rows.find((r) => r.date === dateStr);
    result.push({
      date: dateStr,
      points: existing ? Number(existing.points) : 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}
