// ============================================================================
// /profiles/[id] — Server component: Clean Habit Tracking Homepage
// Profiles & History moved to /profiles/[id]/settings for a focused experience.
// Uses ProfileHomeContent (client) for responsive TopBar + HabitBoard.
// ============================================================================

import { getProfileById } from '@modules/profiles/actions';
import ProfileHomeContent from './ProfileHomeContent';
import ModuleErrorBoundary from '@/core/error-boundary';

export default async function ProfilePage({ params }: { params: { id: string } }) {
  const profileId = params.id;
  let profileName = 'Habit Tracker';
  let profileEmoji = '';

  try {
    const profile = await getProfileById(parseInt(profileId, 10));
    if (profile) {
      profileName = profile.name ?? 'Habit Tracker';
      profileEmoji = profile.emoji ?? '';
    }
  } catch {
    // Profile fetch failed — use defaults
  }

  return (
    <div>
      {/* Hidden profile info for client components */}
      <meta name="profile-name" content={profileName} />
      <meta name="profile-emoji" content={profileEmoji} />

      {/* Habit board with responsive TopBar */}
      <ModuleErrorBoundary moduleName="habits">
        <ProfileHomeContent profileId={profileId} />
      </ModuleErrorBoundary>
    </div>
  );
}