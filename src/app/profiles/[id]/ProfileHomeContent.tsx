'use client';

// ============================================================================
// ProfileHomeContent — Client component that wraps HabitBoard with TopBar
// Manages habit creation state and passes callbacks to children
// ============================================================================

import { useState } from 'react';
import TopBar from '@/modules/layout/components/TopBar';
import HabitBoard from '@modules/habits/components/HabitBoard';

interface ProfileHomeContentProps {
  profileId: string;
}

export default function ProfileHomeContent({ profileId }: ProfileHomeContentProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="mx-auto max-w-2xl space-y-4 sm:space-y-6">
        {/* Responsive TopBar */}
        <TopBar
          currentProfileId={profileId}
          onAddHabit={() => setShowCreateForm(true)}
          showCreateForm={showCreateForm}
          onCreateFormCancel={() => setShowCreateForm(false)}
        />

        {/* Habit board for active profile (creation form is in TopBar area) */}
        <HabitBoard profileId={profileId} />
      </div>
    </div>
  );
}