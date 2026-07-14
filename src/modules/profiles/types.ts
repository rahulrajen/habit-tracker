// ============================================================================
// Profiles Module — Type helpers
// Re-exports shared types from core; adds module-specific derived types.
// ============================================================================

export type { ProfileId, ProfileSummary, Profile } from '@core/contracts';

import type { Profile as CoreProfile, ProfileSummary as CoreProfileSummary } from '@core/contracts';

/**
 * Profile item shown in the switcher list.
 * Derives `isActive` from whether `archived_at` is null.
 */
export interface ProfileListItem extends Omit<CoreProfileSummary, 'target_points'> {
  target_points: number;
  isActive: boolean; // true when archived_at is null (non-archived = active)
}

/** Convert a core Profile to a ProfileListItem for the UI layer. */
export function toProfileListItem(profile: CoreProfile): ProfileListItem {
  return {
    id: profile.id,
    name: profile.name,
    emoji: profile.emoji,
    target_points: profile.target_points,
    isActive: profile.archived_at === null,
  };
}

/** Input shape for the create-profile form UI (same as contract but exported for convenience). */
export interface CreateProfileForm {
  name: string;
  emoji: string;
  target_points: number | ''; // '' allows uncontrolled input to show empty before validation
}