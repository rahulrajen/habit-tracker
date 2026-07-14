// ============================================================================
// Profiles Module — Server Actions (CRUD + soft ceiling)
// All public API goes through these functions; API routes import from here.
// ============================================================================

import { profiles } from '@core/schema';
import { createNotFoundError, createLimitExceededError, createValidationError } from '@core/errors';
import { db } from '@core/db';
import { z } from 'zod';
import { eq, count, isNull, isNotNull, desc } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Zod Schemas — validation at every boundary
// ---------------------------------------------------------------------------

export const createProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(64, 'Name must be 64 characters or less'),
  emoji: z.string().min(1, 'Emoji is required').max(4, 'Emoji must be 4 characters or less'),
  target_points: z.number().int().positive('Target points must be a positive integer').min(1),
});

export const updateTargetSchema = z.object({
  target_points: z.number().int().positive('Target points must be a positive integer').min(1),
});

// ---------------------------------------------------------------------------
// KNOWN LIMITATION — Ceiling Race Condition (accepted per spec Section 4)
// The 8-profile soft ceiling uses two separate queries (COUNT then INSERT)
// under READ COMMITTED isolation. In the extremely unlikely event that two
// family members create a new profile simultaneously, both could see count=7
// and both succeed, yielding 9 profiles. This is a deliberate tradeoff —
// closing it properly would require advisory locks or SERIALIZABLE transactions
// with retry logic for a scenario whose probability and consequence (one extra
// profile) make it not worth the plumbing cost. Same design philosophy as the
// no-rate-limiter decision: low probability, low consequence, accept residual risk.
// ---------------------------------------------------------------------------

const MAX_NON_ARCHIVED_PROFILES = 8;

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

/** Returns all non-archived profiles sorted by creation date (newest first). */
async function getAllActiveProfiles() {
  return db
    .select()
    .from(profiles)
    .where(isNull(profiles.archived_at))
    .orderBy(desc(profiles.created_at));
}

// ---------------------------------------------------------------------------
// Public actions
// ---------------------------------------------------------------------------

/**
 * Get all non-archived profiles for the switcher UI.
 */
export async function getAllProfiles() {
  return getAllActiveProfiles();
}

/**
 * Get a single profile by ID. Throws 404 if not found or archived.
 */
export async function getProfileById(id: number) {
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, id));

  if (!profile || profile.archived_at !== null) {
    throw createNotFoundError('Profile', id);
  }

  return profile;
}

/**
 * Create a new profile. Enforces the 8-profile soft ceiling (non-archived only).
 */
export async function createProfile(input: unknown) {
  const validated = createProfileSchema.parse(input);

  // Count non-archived profiles
  const [row] = await db
    .select({ c: count() })
    .from(profiles)
    .where(isNull(profiles.archived_at));

  const activeCount = row?.c ?? 0;

  if (activeCount >= MAX_NON_ARCHIVED_PROFILES) {
    throw createLimitExceededError('profile', MAX_NON_ARCHIVED_PROFILES);
  }

  const [newProfile] = await db
    .insert(profiles)
    .values({
      name: validated.name,
      emoji: validated.emoji,
      target_points: validated.target_points,
    })
    .returning();

  return newProfile;
}

/**
 * Update a profile's target points.
 */
export async function updateTarget(profileId: number, input: unknown) {
  const validated = updateTargetSchema.parse(input);

  // Verify profile exists and is not archived
  const [existing] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, profileId));

  if (existing === undefined || existing.archived_at !== null) {
    throw createNotFoundError('Profile', profileId);
  }

  const [updated] = await db
    .update(profiles)
    .set({ target_points: validated.target_points })
    .where(eq(profiles.id, profileId))
    .returning();

  return updated;
}

/**
 * Archive a profile (soft-delete). Throws if it would be the last non-archived.
 */
export async function archiveProfile(profileId: number) {
  // Verify profile exists and is currently active FIRST
  const [existing] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, profileId));

  if (existing === undefined || existing.archived_at !== null) {
    throw createNotFoundError('Profile', profileId);
  }

  // Count non-archived profiles (ensure at least 2 before archiving)
  const [row] = await db
    .select({ c: count() })
    .from(profiles)
    .where(isNull(profiles.archived_at));

  const activeCount = row?.c ?? 0;

  if (activeCount <= 1) {
    throw createValidationError(
      'Cannot archive the last non-archived profile',
      'At least one non-archived profile must always exist.',
    );
  }

  const [archived] = await db
    .update(profiles)
    .set({ archived_at: new Date() })
    .where(eq(profiles.id, profileId))
    .returning();

  return archived;
}
