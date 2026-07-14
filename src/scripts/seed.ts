// ============================================================================
// Seed Script — Idempotent sample data for local dev + test databases
// Safe to re-run; uses ON CONFLICT DO NOTHING / WHERE NOT EXISTS patterns
// ============================================================================

import { Pool, PoolClient } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL ?? '';

/** Create a pg pool from DATABASE_URL */
function createPool() {
  return new Pool({ connectionString: DATABASE_URL, ssl: false });
}

/** Insert sample habits for a given profile_id */
async function seedHabits(client: PoolClient, profileId: number): Promise<void> {
  const samples = [
    { text: 'Morning exercise', emoji: '\u{1F3CB}', points: 10 },
    { text: 'Read 30 minutes', emoji: '\u{1F4D6}', points: 8 },
    { text: 'Drink 2L water', emoji: '\u{1F4B6}', points: 5 },
    { text: 'No junk food', emoji: '\u{1F955}', points: 7 },
    { text: 'Meditate 10 min', emoji: '\u{1F9D8}', points: 6 },
  ];

  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    await client.query(
      `INSERT INTO habits (profile_id, text, emoji, points, display_order, archived_at) 
       VALUES ($1, $2, $3, $4, $5, NULL)
       ON CONFLICT DO NOTHING`,
      [profileId, s.text, s.emoji, s.points, i]
    );
  }
}

/** Insert sample completions for a given profile_id and habit_ids */
async function seedCompletions(
  client: PoolClient,
  profileId: number,
  habitIds: Map<number, number[]> // profile_id -> [habit_id, ...]
): Promise<void> {
  const now = new Date();
  // Generate completions for the last 7 days (excluding today for variety)
  for (let dayOffset = 1; dayOffset <= 6; dayOffset++) {
    const completionDate = new Date(now);
    completionDate.setDate(completionDate.getDate() - dayOffset);
    // IST offset: add 5.5 hours to get IST date
    const istDate = new Date(completionDate.getTime() + 5.5 * 60 * 60 * 1000);
    const istDateStr = istDate.toISOString().split('T')[0];

    for (const [pid, habitIdsArr] of habitIds) {
      // Randomly complete some habits on some days
      for (let hi = 0; hi < habitIdsArr.length; hi++) {
        const shouldComplete = Math.random() > 0.4; // ~60% completion rate
        if (!shouldComplete) continue;

        const habitId = habitIdsArr[hi];
        try {
          await client.query(
            `INSERT INTO habit_completions (habit_id, profile_id, completed_date, completed_at) 
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (habit_id, completed_date) DO NOTHING`,
            [habitId, pid, istDateStr, new Date(completionDate)]
          );
        } catch {
          // Skip on duplicate or constraint violation
        }
      }
    }
  }

  const total = await client.query(
    'SELECT COUNT(*) FROM habit_completions hc JOIN habits h ON h.id = hc.habit_id WHERE h.profile_id = $1',
    [profileId]
  );
   // eslint-disable-next-line no-console
   console.log(`  Completions seeded: ${total.rows[0].count}`);
}

/** Insert sample profiles (idempotent via ON CONFLICT) */
async function seedProfiles(client: PoolClient): Promise<Map<number, number[]>> {
  const samples = [
    { name: 'Parent 1', emoji: '\u{1F468}', target_points: 50 },
    { name: 'Parent 2', emoji: '\u{1F469}', target_points: 50 },
    { name: 'Kid A', emoji: '\u{1F467}', target_points: 30 },
  ];

  const profileIds = new Map<number, number[]>(); // profile_id -> [habit_ids]

  for (const s of samples) {
    const result = await client.query(
      `INSERT INTO profiles (name, emoji, target_points, archived_at) 
       VALUES ($1, $2, $3, NULL)
       ON CONFLICT DO NOTHING RETURNING id`,
      [s.name, s.emoji, s.target_points]
    );

    if (result.rows.length > 0) {
      // New profile was inserted — seed habits + completions
      const newId = result.rows[0].id;
      await seedHabits(client, newId);

      // Get the habit ids for this profile
      const habitsResult = await client.query(
        'SELECT id FROM habits WHERE profile_id = $1 AND archived_at IS NULL ORDER BY display_order',
        [newId]
      );
      const habitIds = habitsResult.rows.map((h: { id: number }) => h.id);
      profileIds.set(newId, habitIds);

      if (habitIds.length > 0) {
        await seedCompletions(client, newId, profileIds);
      }
    } else {
      // Profile already exists — check if it has habits
      const existingResult = await client.query(
        'SELECT id FROM profiles WHERE name = $1 AND archived_at IS NULL LIMIT 1',
        [s.name]
      );
      if (existingResult.rows.length > 0) {
        const existingId = existingResult.rows[0].id;
        const habitsResult = await client.query(
          'SELECT id FROM habits WHERE profile_id = $1 AND archived_at IS NULL ORDER BY display_order',
          [existingId]
        );
        const habitIds = habitsResult.rows.map((h: { id: number }) => h.id);

        if (habitIds.length > 0) {
          profileIds.set(existingId, habitIds);
          await seedCompletions(client, existingId, profileIds);
        }
      }
    }
  }

   const count = await client.query('SELECT COUNT(*) FROM profiles WHERE archived_at IS NULL');
   // eslint-disable-next-line no-console
   console.log(`  Profiles seeded: ${count.rows[0].count}`);

  return profileIds;
}

/** Main entry point */
async function main() {
// eslint-disable-next-line no-console
console.log('Seeding database...');
  const pool = createPool();

  try {
    await pool.connect(); // verify connection
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Clear existing seed data for idempotent re-run
      await client.query(
        "DELETE FROM habit_completions USING habits WHERE habits.id = habit_completions.habit_id AND habits.profile_id IN (SELECT id FROM profiles WHERE name IN ('Parent 1', 'Parent 2', 'Kid A'))"
      );
      await client.query("DELETE FROM habits USING profiles WHERE profiles.id = habits.profile_id AND profiles.name IN ('Parent 1', 'Parent 2', 'Kid A')");
      await client.query("DELETE FROM profiles WHERE name IN ('Parent 1', 'Parent 2', 'Kid A')");

      await seedProfiles(client);

      await client.query('COMMIT');
      // eslint-disable-next-line no-console
      console.log('Seed complete.');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Seed failed:', err);
  process.exit(1);
});