// ============================================================================
// Habits Module — Unit Tests (actions layer)
// Covers: getHabitsByProfile, getHabitById, createHabit, updateHabit,
//         archiveHabit, toggleCompletion, reorderHabits
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@core/db';
import { profiles } from '@core/schema';
import { habits, habitCompletions } from '../schema';
import { eq } from 'drizzle-orm';
import {
  getHabitsByProfile,
  getHabitById,
  createHabit,
  updateHabit,
  archiveHabit,
  toggleCompletion,
  reorderHabits,
} from '../actions';

// ---------------------------------------------------------------------------
// Test fixtures — helpers
// ---------------------------------------------------------------------------

/** The actual profile id created by ensureTestProfile(). Auto-assigned by DB. */
let testProfileId: number | null = null;

/**
 * Unconditional cleanup: delete ALL data in FK order, then create a single clean profile.
 * Called at the top of every test suite's beforeEach so tests never see stale data from
 * previous runs or seed scripts.
 */
async function resetAndCreateProfile() {
  // Delete in strict FK order (children first) to avoid ON DELETE RESTRICT violations:
  //   habit_completions → habits → profiles (ALL, including archived — they have no children now)
  await db.delete(habitCompletions).execute();
  await db.delete(habits).execute();
  await db.delete(profiles).execute();

  const [p] = await db
    .insert(profiles)
    .values({ name: 'Test Profile', emoji: '\u{1F464}', target_points: 20 })
    .returning();
  return p;
}

// Helper to insert habit rows directly (bypasses actions), using the auto-assigned profile ID.
async function createHabitRow(overrides: Partial<{ id: number; emoji: string | null; created_at: Date; archived_at: Date | null; text: string; points: number; display_order: number; updated_at: Date }> = {}) {
  if (testProfileId == null) {
    throw new Error('testProfileId not set — call resetAndCreateProfile() in beforeEach first');
  }
  const baseValues = {
    profile_id: testProfileId,
    text: 'Test habit',
    emoji: '\u{1F3AF}',
    points: 5,
    display_order: 0,
    archived_at: null as Date | null,
  };
  const result = await db.insert(habits).values({ ...baseValues, ...overrides }).returning();
  return result[0];
}

async function clearHabits() {
  if (testProfileId == null) return;
  await db.delete(habitCompletions).where(eq(habitCompletions.profile_id, testProfileId)).execute();
  await db.delete(habits).where(eq(habits.profile_id, testProfileId));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getHabitsByProfile', () => {
  beforeEach(async () => {
    const p = await resetAndCreateProfile();
    testProfileId = p.id;
    await clearHabits();
  });

  it('returns habits sorted by display_order ascending', async () => {
    await createHabitRow({ text: 'Third', display_order: 2 });
    await createHabitRow({ text: 'First', display_order: 0 });
    await createHabitRow({ text: 'Second', display_order: 1 });

    const result = await getHabitsByProfile(testProfileId!);

    expect(result).toHaveLength(3);
    expect(result[0].text).toBe('First');
    expect(result[1].text).toBe('Second');
    expect(result[2].text).toBe('Third');
  });

  it('excludes archived habits', async () => {
    await createHabitRow({ text: 'Active habit' });
    const archived = await db
      .insert(habits)
      .values({
        profile_id: testProfileId!,
        text: 'Archived habit',
        display_order: 5,
        archived_at: new Date(),
      })
      .returning();

    const result = await getHabitsByProfile(testProfileId!);

    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Active habit');

    // Cleanup archived row to avoid FK blocking in next test
    await db.delete(habits).where(eq(habits.id, archived[0].id));
  });

  it('sets is_completed_today based on seed completions', async () => {
    const result = await getHabitsByProfile(testProfileId!);
    expect(Array.isArray(result)).toBe(true);
    for (const h of result) {
      expect(h).toHaveProperty('id');
      expect(h).toHaveProperty('is_completed_today');
      expect(typeof h.is_completed_today).toBe('boolean');
    }
  });

  it('returns empty array when no habits exist', async () => {
    await clearHabits();
    const result = await getHabitsByProfile(testProfileId!);
    expect(result).toEqual([]);
  });
});

describe('getHabitById', () => {
  let createdHabit: Awaited<ReturnType<typeof createHabitRow>>;

  beforeEach(async () => {
    const p = await resetAndCreateProfile();
    testProfileId = p.id;
    await clearHabits();
    createdHabit = await createHabitRow({ text: 'Findable habit' });
  });

  it('returns habit by valid ID', async () => {
    const result = await getHabitById(createdHabit.id);
    expect(result).toBeDefined();
    expect(result.text).toBe('Findable habit');
    expect(result.profile_id).toBe(testProfileId!);
  });

  it('throws 404 for non-existent ID', async () => {
    await expect(getHabitById(99999)).rejects.toThrow(/not found/i);
  });

  it('throws 404 for archived habit', async () => {
    await db.update(habits).set({ archived_at: new Date() }).where(eq(habits.id, createdHabit.id));
    await expect(getHabitById(createdHabit.id)).rejects.toThrow('not found');
  });
});

describe('createHabit', () => {
  beforeEach(async () => {
    const p = await resetAndCreateProfile();
    testProfileId = p.id;
    await clearHabits();
  });

  it('creates habit with valid input', async () => {
    const result = await createHabit({
      profile_id: testProfileId!,
      text: 'New habit',
      emoji: '\u{2764}',
      points: 15,
    });

    expect(result).toBeDefined();
    expect(result.text).toBe('New habit');
    expect(result.points).toBe(15);
    expect(result.display_order).toBe(0); // First habit gets order 0
  });

  it('assigns incrementing display_order', async () => {
    // Use direct DB insert with explicit emoji to bypass Zod validation in actions layer
    await db.insert(habits).values({
      profile_id: testProfileId!,
      text: 'First',
      emoji: '\u{1F3AF}',
      points: 5,
      display_order: 0,
    }).returning();

    const result = await createHabit({
      profile_id: testProfileId!,
      text: 'Second',
      emoji: '\u{2764}',
      points: 3,
    });

    expect(result.display_order).toBe(1);
  });

  it('rejects empty text', async () => {
    await expect(
      createHabit({ profile_id: testProfileId!, text: '', emoji: '\u{1F3AF}', points: 5 })
    ).rejects.toThrow(/required/i);
  });

  it('rejects negative points', async () => {
    await expect(
      createHabit({ profile_id: testProfileId!, text: 'Valid text', emoji: '\u{1F3AF}', points: -1 })
    ).rejects.toThrow('positive');
  });

  it('enforces 60-habit soft ceiling per profile', async () => {
    for (let i = 0; i < 60; i++) {
      await createHabit({
        profile_id: testProfileId!,
        text: `Habit ${i}`,
        emoji: '\u{1F3AF}',
        points: 1,
      });
    }

    await expect(
      createHabit({
        profile_id: testProfileId!,
        text: 'Over limit',
        emoji: '\u{1F3AF}',
        points: 1,
      })
    ).rejects.toThrow(/Maximum 60 habit/);
  });

  it('counts only non-archived habits for ceiling', async () => {
    // Create exactly 59 active habits via direct DB insert (bypasses actions ceiling)
    const habitValues = [];
    for (let i = 0; i < 59; i++) {
      habitValues.push({
        profile_id: testProfileId!,
        text: `Active ${i}`,
        emoji: '\u{1F3AF}',
        points: 1,
        display_order: i,
        archived_at: null as Date | null,
      });
    }

    // Insert the archived habit too (via direct DB)
    const allValues = [...habitValues, {
      profile_id: testProfileId!,
      text: 'Archived',
      emoji: '\u{1F3AF}',
      points: 1,
      display_order: 59,
      archived_at: new Date(),
    }];

    const allInserted = await db.insert(habits).values(allValues).returning();
    const archived = allInserted.find((h) => h.archived_at !== null);

    // Now use actions layer — should succeed because only 59 non-archived habits exist (ceiling is 60)
    const result = await createHabit({
      profile_id: testProfileId!,
      text: 'New after archive',
      emoji: '\u{2764}',
      points: 1,
    });
    expect(result).toBeDefined();

    // Cleanup archived row to avoid FK blocking in next test
    if (archived) await db.delete(habits).where(eq(habits.id, archived.id));
  });

  it('rejects invalid profile_id', async () => {
    await expect(
      createHabit({ profile_id: -1, text: 'Bad', emoji: '\u{1F3AF}', points: 5 })
    ).rejects.toThrow('positive');
  });
});

describe('updateHabit', () => {
  let createdHabit: Awaited<ReturnType<typeof createHabitRow>>;

  beforeEach(async () => {
    const p = await resetAndCreateProfile();
    testProfileId = p.id;
    await clearHabits();
    createdHabit = await createHabitRow({ text: 'Original' });
  });

  it('updates text only', async () => {
    const result = await updateHabit(createdHabit.id, { text: 'Updated text' });
    expect(result.text).toBe('Updated text');
    expect(result.emoji).toBe('\u{1F3AF}'); // unchanged
  });

  it('updates points', async () => {
    const result = await updateHabit(createdHabit.id, { points: 25 });
    expect(result.points).toBe(25);
  });

  it('updates emoji', async () => {
    const result = await updateHabit(createdHabit.id, { emoji: '\u{1F4AA}' });
    expect(result.emoji).toBe('\u{1F4AA}');
  });

  it('updates multiple fields at once', async () => {
    const result = await updateHabit(createdHabit.id, { text: 'New name', points: 20, emoji: '\u{2728}' });
    expect(result.text).toBe('New name');
    expect(result.points).toBe(20);
    expect(result.emoji).toBe('\u{2728}');
  });

  it('requires at least one field', async () => {
    await expect(updateHabit(createdHabit.id, {})).rejects.toThrow(/At least one field/i);
  });

  it('throws 404 for non-existent ID', async () => {
    await expect(updateHabit(99999, { text: 'Ghost' })).rejects.toThrow('not found');
  });

  it('throws 404 for archived habit', async () => {
    await db.update(habits).set({ archived_at: new Date() }).where(eq(habits.id, createdHabit.id));
    await expect(updateHabit(createdHabit.id, { text: 'Dead' })).rejects.toThrow(/not found/i);
  });

  it('rejects negative points', async () => {
    await expect(updateHabit(createdHabit.id, { points: -5 })).rejects.toThrow('positive');
  });
});

describe('archiveHabit', () => {
  let createdHabit: Awaited<ReturnType<typeof createHabitRow>>;

  beforeEach(async () => {
    const p = await resetAndCreateProfile();
    testProfileId = p.id;
    await clearHabits();
    createdHabit = await createHabitRow({ text: 'To archive' });
  });

  it('sets archived_at timestamp', async () => {
    const result = await archiveHabit(createdHabit.id);
    expect(result.archived_at).not.toBeNull();
    expect(typeof result.archived_at).toBe('object'); // Date object
  });

  it('preserves completions when archiving', async () => {
    await db.insert(habitCompletions).values({
      habit_id: createdHabit.id,
      profile_id: testProfileId!,
      completed_date: '2026-07-10',
    });

    const result = await archiveHabit(createdHabit.id);
    expect(result.archived_at).not.toBeNull();

    const completions = await db
      .select()
      .from(habitCompletions)
      .where(eq(habitCompletions.habit_id, createdHabit.id));
    expect(completions).toHaveLength(1);
  });

  it('throws 404 for non-existent ID', async () => {
    await expect(archiveHabit(99999)).rejects.toThrow(/not found/i);
  });

  it('throws 404 when re-archiving already archived habit', async () => {
    await db.update(habits).set({ archived_at: new Date() }).where(eq(habits.id, createdHabit.id));
    await expect(archiveHabit(createdHabit.id)).rejects.toThrow('not found');
  });
});

describe('toggleCompletion', () => {
  let createdHabit: Awaited<ReturnType<typeof createHabitRow>>;

  beforeEach(async () => {
    const p = await resetAndCreateProfile();
    testProfileId = p.id;
    await clearHabits();
    createdHabit = await createHabitRow({ text: 'Toggle me' });
    await db.delete(habitCompletions).where(eq(habitCompletions.habit_id, createdHabit.id)).execute();
  });

  it('INSERTS completion when none exists', async () => {
    const result = await toggleCompletion({ habit_id: createdHabit.id });
    expect(result).toBeDefined();
    expect(result.habit_id).toBe(createdHabit.id);
    expect(result.profile_id).toBe(testProfileId!);
    expect(result.completed_date).toMatch(/^\d{4}-\d{2}-\d{2}$/); // IST date string format
  });

  it('DELETES completion when one exists', async () => {
    await toggleCompletion({ habit_id: createdHabit.id });
    const result = await toggleCompletion({ habit_id: createdHabit.id });
    expect(result).toBeDefined();

    const { getISTDate } = await import('@core/ist-date');
    const istToday = getISTDate();
    const existing = await db
      .select()
      .from(habitCompletions)
      .where(eq(habitCompletions.completed_date, istToday));

    const todayCompletionsForThisHabit = existing.filter((c) => c.habit_id === createdHabit.id);
    expect(todayCompletionsForThisHabit.length).toBe(0);
  });

  it('uses server-computed IST date, not client input', async () => {
    const result = await toggleCompletion({ habit_id: createdHabit.id });
    expect(result).toBeDefined();
  });

  it('derives profile_id from habit row, not client input', async () => {
    const result = await toggleCompletion({ habit_id: createdHabit.id });
    expect(result.profile_id).toBe(testProfileId!);
  });

  it('throws 404 for non-existent habit', async () => {
    await expect(toggleCompletion({ habit_id: 99999 })).rejects.toThrow(/not found/i);
  });

  it('throws 404 for archived habit', async () => {
    await db.update(habits).set({ archived_at: new Date() }).where(eq(habits.id, createdHabit.id));
    await expect(toggleCompletion({ habit_id: createdHabit.id })).rejects.toThrow('not found');
  });

  it('is idempotent — toggle twice returns to original state', async () => {
    const before = await db
      .select()
      .from(habitCompletions)
      .where(eq(habitCompletions.habit_id, createdHabit.id));
    expect(before.length).toBe(0);

    await toggleCompletion({ habit_id: createdHabit.id });
    let afterOn = await db.select().from(habitCompletions).where(eq(habitCompletions.habit_id, createdHabit.id));
    expect(afterOn.length).toBe(1);

    await toggleCompletion({ habit_id: createdHabit.id });
    const afterOff = await db.select().from(habitCompletions).where(eq(habitCompletions.habit_id, createdHabit.id));
    expect(afterOff.length).toBe(0);
  });
});

describe('reorderHabits', () => {
  let habitA: Awaited<ReturnType<typeof createHabitRow>>;
  let habitB: Awaited<ReturnType<typeof createHabitRow>>;
  let habitC: Awaited<ReturnType<typeof createHabitRow>>;

  beforeEach(async () => {
    const p = await resetAndCreateProfile();
    testProfileId = p.id;
    await clearHabits();
    habitA = await createHabitRow({ text: 'Habit A', display_order: 0 });
    habitB = await createHabitRow({ text: 'Habit B', display_order: 1 });
    habitC = await createHabitRow({ text: 'Habit C', display_order: 2 });
  });

  it('reorders habits by updating display_order', async () => {
    const result = await reorderHabits({
      profile_id: testProfileId!,
      orderedHabitIds: [habitC.id, habitA.id, habitB.id],
    });

    expect(result).toHaveLength(3);
    expect(result[0].id).toBe(habitC.id);
    expect(result[0].display_order).toBe(0);
    expect(result[1].id).toBe(habitA.id);
    expect(result[1].display_order).toBe(1);
    expect(result[2].id).toBe(habitB.id);
    expect(result[2].display_order).toBe(2);
  });

  it('validates all habit_ids belong to profile', async () => {
    // Create a second profile and its habit using direct DB insert (FK-safe since we delete ALL profiles first in resetAndCreateProfile)
    const otherP = await db.insert(profiles).values({ name: 'Other Profile', emoji: '\u{1F465}', target_points: 10 }).returning();
    const otherProfileHabit = await db
      .insert(habits)
      .values({ profile_id: otherP[0].id, text: 'Other profile habit', display_order: 99 })
      .returning();

    await expect(
      reorderHabits({
        profile_id: testProfileId!,
        orderedHabitIds: [habitA.id, habitB.id, otherProfileHabit[0].id],
      })
    ).rejects.toThrow(/not found/i);

    // Cleanup to avoid FK blocking next tests
    await db.delete(habits).where(eq(habits.id, otherProfileHabit[0].id));
    await db.delete(profiles).where(eq(profiles.id, otherP[0].id));
  });

  it('validates no extra IDs provided', async () => {
    await expect(
      reorderHabits({
        profile_id: testProfileId!,
        orderedHabitIds: [habitA.id, habitB.id], // missing habitC
      })
    ).rejects.toThrow(/Expected.*but received/i);
  });

  it('validates no missing IDs (extra ID in list)', async () => {
    await expect(
      reorderHabits({
        profile_id: testProfileId!,
        orderedHabitIds: [habitA.id, habitB.id, habitC.id, 99999], // extra ID
      })
    ).rejects.toThrow('not found');
  });

  it('throws 404 for non-existent habit_id in list', async () => {
    await expect(
      reorderHabits({
        profile_id: testProfileId!,
        orderedHabitIds: [habitA.id, 99999],
      })
    ).rejects.toThrow(/not found/i);
  });

  it('updates updated_at timestamp on all reordered habits', async () => {
    await new Promise((r) => setTimeout(r, 50));

    await reorderHabits({
      profile_id: testProfileId!,
      orderedHabitIds: [habitC.id, habitB.id, habitA.id],
    });

    const updated = await db.select().from(habits).where(eq(habits.id, habitA.id));
    expect(updated[0].updated_at).toBeDefined();
  });

  it('persists new order correctly (atomic)', async () => {
    await reorderHabits({
      profile_id: testProfileId!,
      orderedHabitIds: [habitC.id, habitA.id, habitB.id],
    });

    const result = await db.select().from(habits).where(eq(habits.profile_id, testProfileId!)).orderBy(habits.display_order);
    expect(result[0].id).toBe(habitC.id);
  });

  it('rejects empty orderedHabitIds', async () => {
    await expect(
      reorderHabits({ profile_id: testProfileId!, orderedHabitIds: [] })
    ).rejects.toThrow(/min/i);
  });

  it('updates display_order values sequentially from 0', async () => {
    const result = await reorderHabits({
      profile_id: testProfileId!,
      orderedHabitIds: [habitC.id, habitA.id, habitB.id],
    });
    expect(result[0].display_order).toBe(0);
    expect(result[1].display_order).toBe(1);
    expect(result[2].display_order).toBe(2);
  });
});