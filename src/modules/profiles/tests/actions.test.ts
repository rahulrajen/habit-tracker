// ============================================================================
// Profiles Module — Unit Tests (actions layer)
// Runs against the local test database (habit_tracker_test).
// Uses a pool that prefers TEST_DATABASE_URL when present.
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { profiles } from '@core/schema';
import { eq } from 'drizzle-orm';

// Import habits module schema for FK-safe cleanup
import { habitCompletions, habits } from '@modules/habits/schema';

// Import the actual actions — they use @core/db which points to TEST_DATABASE_URL in test mode.
import {
  getAllProfiles,
  getProfileById,
  createProfile,
  updateTarget,
  archiveProfile,
} from '../actions';


let testPool: Pool | null = null;

beforeEach(async () => {
  if (!testPool) {
    // Prefer TEST_DATABASE_URL when present (vitest sets it via .env.test or explicit env var)
    const connStr = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/habit_tracker_test';
    testPool = new Pool({ connectionString: connStr });
  }

  // Unconditional cleanup: delete ALL data in FK order so each test starts with a clean slate.
  // Both test files share habit_tracker_test — this prevents cross-contamination.
  const testDb = drizzle(testPool);
  await testDb.delete(habitCompletions).execute();
  await testDb.delete(habits).execute();
  await testDb.delete(profiles).execute();
});

// ---------------------------------------------------------------------------
// Helper: insert raw profile rows into the test DB (bypasses actions)
// ---------------------------------------------------------------------------

async function insertProfile(overrides: { name?: string; emoji?: string; target_points?: number; archived_at?: Date | null } = {}) {
  if (!testPool) throw new Error('Test pool not initialized');
  const testDb = drizzle(testPool);
  const [p] = await testDb
    .insert(profiles)
    .values({
      name: overrides.name ?? 'Test Profile',
      emoji: overrides.emoji ?? '\u{1F464}',
      target_points: overrides.target_points ?? 10,
      archived_at: overrides.archived_at ?? null,
    })
    .returning();
  return p;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getAllProfiles', () => {
  it('returns only non-archived profiles', async () => {
    await insertProfile({ name: 'Active' });
    await insertProfile({ name: 'Archived', archived_at: new Date() });

    const result = await getAllProfiles();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Active');
  });

  it('returns profiles sorted by created_at DESC', async () => {
    await insertProfile({ name: 'Older' });
    // Small delay to ensure different timestamps
    await new Promise((r) => setTimeout(r, 50));
    await insertProfile({ name: 'Newer' });

    const result = await getAllProfiles();
    expect(result[0].name).toBe('Newer');
    expect(result[1].name).toBe('Older');
  });
});

describe('getProfileById', () => {
  it('returns a profile by valid id', async () => {
    const p = await insertProfile({ name: 'Found' });
    const result = await getProfileById(p.id);
    expect(result.name).toBe('Found');
  });

  it('throws 404 for non-existent id', async () => {
    await expect(getProfileById(99999)).rejects.toThrow(/Profile/);
  });

  it('throws 404 for archived profile', async () => {
    const p = await insertProfile({ archived_at: new Date() });
    await expect(getProfileById(p.id)).rejects.toThrow(/Profile/);
  });
});

describe('createProfile', () => {
  it('creates a profile with valid input', async () => {
    const result = await createProfile({
      name: 'New Profile',
      emoji: '\u{1F680}',
      target_points: 25,
    });

    expect(result.name).toBe('New Profile');
    expect(result.emoji).toBe('\u{1F680}');
    expect(result.target_points).toBe(25);
    expect(result.archived_at).toBeNull();
  });

  it('rejects invalid input (empty name)', async () => {
    await expect(createProfile({ name: '', emoji: '\u{1F464}', target_points: 10 })).rejects.toThrow(/Name/);
  });

  it('rejects negative target_points', async () => {
    await expect(createProfile({ name: 'X', emoji: '\u{1F464}', target_points: -1 })).rejects.toThrow(/target.*positive/i);
  });

  it('enforces the 8-profile soft ceiling', async () => {
    // Insert 7 profiles via raw insert (bypasses actions layer)
    for (let i = 0; i < 7; i++) {
      await insertProfile({ name: `Profile ${i}` });
    }

    // Create one more via actions — should succeed (total 8 active)
    const result = await createProfile({ name: 'Last One', emoji: '\u{1F464}', target_points: 10 });
    expect(result.name).toBe('Last One');

    // Now try to create another — should fail (8 active ceiling reached)
    await expect(createProfile({ name: 'Overflow', emoji: '\u{1F464}', target_points: 10 })).rejects.toThrow(/profile/);
  });

  it('does NOT count archived profiles toward the ceiling', async () => {
    // Insert 7 active + 1 archived = 8 total, but only 7 non-archived
    for (let i = 0; i < 7; i++) {
      await insertProfile({ name: `Active ${i}` });
    }
    await insertProfile({ name: 'Archived', archived_at: new Date() });

    // Should be able to create one more (archived doesn't count)
    const result = await createProfile({ name: 'New Allowed', emoji: '\u{1F464}', target_points: 10 });
    expect(result.name).toBe('New Allowed');
  });
});

describe('updateTarget', () => {
  it('updates target_points correctly', async () => {
    const p = await insertProfile({ target_points: 10 });
    const result = await updateTarget(p.id, { target_points: 50 });

    expect(result.target_points).toBe(50);
  });

  it('rejects zero or negative target', async () => {
    const p = await insertProfile();
    await expect(updateTarget(p.id, { target_points: 0 })).rejects.toThrow(/target.*positive/i);
  });

  it('throws 404 for archived profile', async () => {
    const p = await insertProfile({ archived_at: new Date() });
    await expect(updateTarget(p.id, { target_points: 20 })).rejects.toThrow(/Profile/);
  });
});

describe('archiveProfile', () => {
  it('sets archived_at without deleting the row', async () => {
    // Need at least 2 profiles so we can archive one and still have an active
    await insertProfile({ name: 'Keep This One' });
    const p = await insertProfile({ name: 'To Archive' });

    const result = await archiveProfile(p.id);

    expect(result.archived_at).not.toBeNull();
    // Verify row still exists in DB (soft-delete, not hard-delete)
    if (!testPool) throw new Error('Test pool not initialized');
    const testDb = drizzle(testPool);
    const [stillThere] = await testDb.select().from(profiles).where(eq(profiles.id, p.id));
    expect(stillThere).toBeDefined();
  });

  it('throws if it would be the last non-archived profile', async () => {
    // Insert exactly 1 profile and try to archive it — should fail
    const p = await insertProfile({ name: 'Last One' });

    await expect(archiveProfile(p.id)).rejects.toThrow(/last.*non-archived/i);
  });

  it('throws 404 for non-existent id', async () => {
    await expect(archiveProfile(99999)).rejects.toThrow(/Profile/);
  });
});