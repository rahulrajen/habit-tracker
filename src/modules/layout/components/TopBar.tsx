'use client';

// ============================================================================
// TopBar — Responsive header with profile display, settings, streak, history
// Post-Go-Live: Static profile display (no dropdown), icon-only action buttons
// Habit management moved to /profiles/[id]/settings
// ============================================================================

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Profile {
  id: number;
  name: string;
  emoji: string;
  target_points: number;
}

interface StreakData {
  streak: number;
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function fetchProfiles(): Promise<Profile[]> {
  const res = await fetch('/api/profiles');
  if (!res.ok) throw new Error('Failed to fetch profiles');
  return res.json();
}

async function fetchStreak(profileId: string): Promise<StreakData> {
  const res = await fetch(`/api/habits/progress?profileId=${profileId}`);
  if (!res.ok) throw new Error('Failed to fetch streak');
  const data = await res.json();
  return { streak: data.streak ?? 0 };
}

// ---------------------------------------------------------------------------
// TopBar component
// ---------------------------------------------------------------------------

interface TopBarProps {
  currentProfileId: string;
  onShowHistory?: () => void;
}

export default function TopBar({ currentProfileId, onShowHistory }: TopBarProps) {
  const router = useRouter();

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: fetchProfiles,
    staleTime: 30000,
  });

  const { data: streakData } = useQuery({
    queryKey: ['streak', currentProfileId],
    queryFn: () => fetchStreak(currentProfileId),
    staleTime: 60000,
  });

  const currentProfile = profiles.find((p: Profile) => p.id.toString() === currentProfileId);

  return (
    <header className="w-full">
      {/* Top navigation — frosted glass bar */}
      <nav className="glass-card flex items-center justify-between px-4 py-2.5 backdrop-blur-xl">
        {/* Left: Active profile display (static, no dropdown) */}
        <div className="flex items-center gap-2">
          {currentProfile?.emoji && <span className="text-lg">{currentProfile.emoji}</span>}
          <span className="text-sm font-medium text-gray-100">
            {currentProfile?.name || 'Profile'}
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Streak badge — hidden on very small screens */}
          {streakData && streakData.streak > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2 py-1 text-xs font-medium text-orange-400 border border-orange-500/20">
              &#128293; {streakData.streak}
            </span>
          )}

          {/* History button — icon only */}
          <button
            onClick={() => onShowHistory?.()}
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-gray-400 hover:border-white/20 hover:text-white transition-all"
            aria-label="View history"
          >
            <span className="text-xl">📊</span>
          </button>

          {/* Settings — icon only */}
          <button
            onClick={() => router.push(`/profiles/${currentProfileId}/settings`)}
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-gray-400 hover:border-white/20 hover:text-white transition-all"
            aria-label="Settings"
          >
            <span className="text-xl">⚙️</span>
          </button>
        </div>
      </nav>
    </header>
  );
}