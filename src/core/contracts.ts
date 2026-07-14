// ============================================================================
// Shared Types — the ONLY surface both modules can import from core
// No other module should define types that cross module boundaries
// ============================================================================

/** Unique identifier for a profile */
export type ProfileId = number;

/** Minimal profile data shown in the switcher UI (no sensitive/extra fields) */
export interface ProfileSummary {
  id: ProfileId;
  name: string;
  emoji: string;
  target_points: number;
}

/**
 * Full profile object as stored in the database.
 * The `habits` module does NOT import this — it only uses ProfileSummary.
 */
export interface Profile extends ProfileSummary {
  archived_at: Date | null;
  created_at: Date;
}

/** Input shape for creating a new profile (Zod-validated) */
export interface CreateProfileInput {
  name: string;
  emoji: string;
  target_points: number;
}

/** Input shape for updating a profile's target points */
export interface UpdateTargetInput {
  target_points: number;
}