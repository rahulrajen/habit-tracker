'use client';

// ============================================================================
// ProfileHomeContent — Client component that wraps HabitBoard with TopBar
// Manages history popout visibility (habit creation moved to settings page)
// ============================================================================

import { useState } from 'react';
import TopBar from '@/modules/layout/components/TopBar';
import HabitBoard from '@modules/habits/components/HabitBoard';
import HistoryPopout from '@modules/habits/components/HistoryPopout';

interface ProfileHomeContentProps {
  profileId: string;
}

export default function ProfileHomeContent({ profileId }: ProfileHomeContentProps) {
  const [showHistory, setShowHistory] = useState(false);

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="mx-auto max-w-2xl space-y-4 sm:space-y-6">
        {/* Responsive TopBar */}
        <TopBar
          currentProfileId={profileId}
          onShowHistory={() => setShowHistory(true)}
        />

        {/* Habit board for active profile */}
        <HabitBoard profileId={profileId} />

        {/* iOS-style floating history popout */}
        <HistoryPopout
          profileId={profileId}
          show={showHistory}
          onClose={() => setShowHistory(false)}
        />
      </div>
    </div>
  );
}