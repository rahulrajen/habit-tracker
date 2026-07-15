'use client';

// ============================================================================
// HabitBoard — Client component: habits with completion toggle (no drag-drop)
// Habit management moved to /profiles/[id]/settings page
// Post-Go-Live v4: Simple tap-to-toggle cards, no reordering on main page
// ============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useRef } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HabitItem {
  id: number;
  profile_id: number;
  text: string;
  emoji: string;
  points: number;
  display_order: number;
  is_completed_today: boolean;
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function fetchHabits(profileId: string): Promise<HabitItem[]> {
  const res = await fetch(`/api/habits?profileId=${profileId}`);
  if (!res.ok) throw new Error('Failed to fetch habits');
  return res.json();
}

async function toggleCompletion(habitId: number): Promise<void> {
  const res = await fetch(`/api/habits/${habitId}/completion`, { method: 'POST' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(body.error || 'Toggle failed');
  }
}

// ---------------------------------------------------------------------------
// HabitBoard — Main component
// ---------------------------------------------------------------------------

interface HabitBoardProps {
  profileId: string;
}

export default function HabitBoard({ profileId }: HabitBoardProps) {
  const queryClient = useQueryClient();

  // Tab visibility tracking (pauses refetch when tab is hidden)
  const [isTabVisible, setIsTabVisible] = useState(true);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Fetch habits (sorted by display_order from server)
  const { data: habits = [], isLoading, error } = useQuery({
    queryKey: ['habits', profileId],
    queryFn: () => fetchHabits(profileId),
    refetchInterval: !isTabVisible ? false : 15000,
    refetchOnWindowFocus: true,
  });

  // Fetch progress for confetti and progress bar
  const { data: progress } = useQuery({
    queryKey: ['progress', profileId],
    queryFn: () => fetch(`/api/habits/progress?profileId=${profileId}`).then((r) => r.json()),
    refetchInterval: !isTabVisible ? false : 15000,
  });

  // Confetti transition tracking
  const [currentProgressIsMet, setCurrentProgressIsMet] = useState(false);
  const prevTargetMetRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (progress == null) return;

    const nowMet = progress.isTargetMet && !progress.hasZeroTarget;

    if (prevTargetMetRef.current === false && nowMet === true) {
      setCurrentProgressIsMet(true);
    } else if (!nowMet) {
      setCurrentProgressIsMet(false);
    }

    prevTargetMetRef.current = nowMet;
  }, [progress]);

  // Toggle completion mutation
  const toggleMutation = useMutation({
    mutationFn: toggleCompletion,
    onMutate: async (habitId) => {
      await queryClient.cancelQueries({ queryKey: ['habits', profileId] });
      const previous = queryClient.getQueryData<HabitItem[]>(['habits', profileId]);
      if (previous) {
        queryClient.setQueryData(
          ['habits', profileId],
          previous.map((h) =>
            h.id === habitId ? { ...h, is_completed_today: !h.is_completed_today } : h
          )
        );
      }
      return { previous };
    },
    onError: (_err, _habitId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['habits', profileId], context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['habits', profileId] });
      void queryClient.invalidateQueries({ queryKey: ['progress', profileId] });
    },
  });

  const handleToggle = (habitId: number) => {
    toggleMutation.mutate(habitId);
  };

  if (isLoading) {
    return (
      <div className="space-y-4 py-8">
        <div className="skeleton h-24 rounded-2xl" />
        <div className="skeleton h-16 rounded-xl" />
        <div className="skeleton h-16 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-8 text-center backdrop-blur-xl">
        <p className="mb-3 text-red-400">Failed to load habits.</p>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['habits', profileId] })}
          className="rounded-xl bg-indigo-500 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-400 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const completed = habits.filter((h) => h.is_completed_today);
  const active = habits.filter((h) => !h.is_completed_today);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Progress bar */}
      <DailyProgress profileId={profileId} />

      {/* Confetti celebration */}
      <ConfettiCelebration
        isTargetMet={currentProgressIsMet}
        profileId={profileId}
      />

      {/* Completed section — ABOVE active */}
      {completed.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-green-400">
            &#10003; Completed ({completed.length})
          </h2>
          <div className="space-y-2">
            {completed.map((habit) => (
              <HabitCard key={habit.id} habit={habit} onToggle={handleToggle} />
            ))}
          </div>
        </section>
      )}

      {/* Active habits — BELOW completed */}
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Active ({active.length})
        </h2>
        {active.length > 0 ? (
          <div className="space-y-2">
            {active.map((habit) => (
              <HabitCard key={habit.id} habit={habit} onToggle={handleToggle} />
            ))}
          </div>
        ) : (
          <div className="glass-card p-6 text-center backdrop-blur-md">
            <p className="text-sm text-gray-500">
              {habits.length === 0
                ? 'No habits yet. Go to Settings ⚙️ to add your first habit!'
                : 'All habits completed! Great job! 🎉'}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Re-export components
// ---------------------------------------------------------------------------

import DailyProgress from './DailyProgress';
import ConfettiCelebration from './ConfettiCelebration';
import HabitCard from './HabitCard';