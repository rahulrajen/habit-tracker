// ============================================================================
// /profiles/[id] — Server component: Profile Detail Page
// Shows profile switcher header + habit board for the selected profile.
// Phase 2: embeds HabitBoard (completed/active cards, tap-to-complete).
// Phase 3: adds progress bar, confetti, history chart here.
// Phase 4: wraps modules in error boundaries for isolation.
// ============================================================================

import ProfileSwitcher from '@modules/profiles/components/ProfileSwitcher';
import HabitBoard from '@modules/habits/components/HabitBoard';
import ModuleErrorBoundary from '@/core/error-boundary';

export default function ProfilePage({ params }: { params: { id: string } }) {
  const profileId = params.id;

  return (
    <div className="min-h-screen bg-surface-dark px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="mb-2 text-center">
          <h1 className="text-3xl font-bold text-gray-100">Habit Tracker</h1>
        </div>

        {/* Profile switcher — wrapped in error boundary for module isolation */}
        <ModuleErrorBoundary moduleName="profiles">
          <ProfileSwitcher />
        </ModuleErrorBoundary>

        {/* Habit board for active profile — wrapped in error boundary for module isolation */}
        {profileId && (
          <div className="glass-card p-4">
            <ModuleErrorBoundary moduleName="habits">
              <HabitBoard profileId={profileId} />
            </ModuleErrorBoundary>
          </div>
        )}
      </div>
    </div>
  );
}
