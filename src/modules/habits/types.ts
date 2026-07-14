// ============================================================================
// Habits Module — Type helpers
// Re-exports shared types from core; adds module-specific derived types.
// ============================================================================

/**
 * Habit item shown in the UI card list.
 */
export interface HabitListItem {
  id: number;
  profile_id: number;
  text: string;
  emoji: string;
  points: number;
  display_order: number;
  is_completed_today: boolean; // true when a completion exists for IST today
}

/**
 * Input shape for the create-habit form UI.
 */
export interface NewHabitForm {
  profile_id: number;
  text: string;
  emoji: string;
  points: number;
}

/**
 * Input shape for updating a habit (all fields optional).
 */
export interface UpdateHabitInput {
  text?: string;
  emoji?: string;
  points?: number;
}

/**
 * Full habit detail joined with the profile's target_points.
 * Used by the progress bar calculation in Phase 3.
 */
export interface HabitDetail extends HabitListItem {
  profile_target_points: number; // read from profiles table, used for progress bar
}

/**
 * Input shape for the completion toggle endpoint.
 */
export interface ToggleCompletionInput {
  habit_id: number;
}

/**
 * Input shape for the reorder endpoint.
 */
export interface ReorderHabitsInput {
  profile_id: number;
  orderedHabitIds: number[];
}

/**
 * Convert a core Habit row (with is_completed_today joined) to a HabitListItem.
 */
export function toHabitListItem(habit: HabitListItem): HabitListItem {
  return habit; // already in the correct shape — exported for consistency with profiles pattern
}