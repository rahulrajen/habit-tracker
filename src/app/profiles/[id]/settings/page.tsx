'use client';

// ============================================================================
// /profiles/[id]/settings — Settings page with Profile + Habit management
// Clicking a profile in the list does NOT navigate away — just updates active state.
// Use "Back to Habits" button to return to main page for that profile.
// ============================================================================

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import ProfileSwitcher from '@modules/profiles/components/ProfileSwitcher';
import ModuleErrorBoundary from '@/core/error-boundary';
import HabitSettings from './HabitSettings';

export default function SettingsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  // Use the URL param as source of truth for which profile's habits to show
  const [currentProfileId, setCurrentProfileId] = useState(params.id);

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Back navigation — goes to main page for currentProfileId */}
        <button
          onClick={() => router.push(`/profiles/${currentProfileId}`)}
          className="inline-flex items-center gap-2 rounded-xl border border-glass-border bg-glass/30 px-4 py-2 text-sm text-gray-300 backdrop-blur-md transition-all hover:border-white/25 hover:bg-glass/50 hover:text-white"
        >
          <span className="text-lg">←</span>
          Back to Habits
        </button>

        {/* Profiles Section */}
        <section className="glass-card p-5 backdrop-blur-xl">
          <h2 className="mb-4 text-lg font-semibold text-gray-100">Profiles</h2>
          <ModuleErrorBoundary moduleName="profiles">
            {/* onProfileSelect is called when a profile is clicked.
                We update currentProfileId so HabitSettings below shows that profile's habits. */}
            <ProfileSwitcher onProfileSelect={setCurrentProfileId} />
          </ModuleErrorBoundary>
        </section>

        {/* Habits Section — add, remove, rearrange habits for the selected profile */}
        <section className="glass-card p-5 backdrop-blur-xl space-y-4">
          <h2 className="text-lg font-semibold text-gray-100">Habits</h2>
          <ModuleErrorBoundary moduleName="habits">
            <HabitSettings profileId={currentProfileId} />
          </ModuleErrorBoundary>
        </section>
      </div>
    </div>
  );
}