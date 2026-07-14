'use client';

// ============================================================================
// ProfileHomeContent — Client component that wraps HabitBoard with TopBar
// Manages habit creation state and history popout visibility
// ============================================================================

import { useState } from 'react';
import TopBar from '@/modules/layout/components/TopBar';
import HabitBoard from '@modules/habits/components/HabitBoard';
import HistoryPopout from '@modules/habits/components/HistoryPopout';

interface ProfileHomeContentProps {
  profileId: string;
}

export default function ProfileHomeContent({ profileId }: ProfileHomeContentProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="mx-auto max-w-2xl space-y-4 sm:space-y-6">
        {/* Responsive TopBar */}
        <TopBar
          currentProfileId={profileId}
          onAddHabit={() => setShowCreateForm(true)}
          onShowHistory={() => setShowHistory(true)}
          showCreateForm={showCreateForm}
          onCreateFormCancel={() => setShowCreateForm(false)}
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