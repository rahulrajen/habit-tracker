'use client';

// ============================================================================
// /profiles/[id]/settings — Settings page with Profile management & History
// Moved from homepage to keep the main page clean for habit tracking.
// ============================================================================

import { useRouter } from 'next/navigation';
import ProfileSwitcher from '@modules/profiles/components/ProfileSwitcher';
import HistoryChart from '@modules/habits/components/HistoryChart';
import ModuleErrorBoundary from '@/core/error-boundary';

export default function SettingsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const profileId = params.id;

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Back navigation */}
        <button
          onClick={() => router.push(`/profiles/${profileId}`)}
          className="inline-flex items-center gap-2 rounded-xl border border-glass-border bg-glass/30 px-4 py-2 text-sm text-gray-300 backdrop-blur-md transition-all hover:border-white/25 hover:bg-glass/50 hover:text-white"
        >
          <span className="text-lg">←</span>
          Back to Habits
        </button>

        {/* Profiles Section */}
        <section className="glass-card p-5 backdrop-blur-xl">
          <h2 className="mb-4 text-lg font-semibold text-gray-100">Profiles</h2>
          <ModuleErrorBoundary moduleName="profiles">
            <ProfileSwitcher />
          </ModuleErrorBoundary>
        </section>

        {/* History Section */}
        <section className="glass-card p-5 backdrop-blur-xl">
          <ModuleErrorBoundary moduleName="history">
            <HistoryChart profileId={profileId} days={30} height={280} />
          </ModuleErrorBoundary>
        </section>
      </div>
    </div>
  );
}