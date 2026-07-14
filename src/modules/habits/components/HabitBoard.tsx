'use client';

// ============================================================================
// HabitBoard — Client component: habits split into completed/active sections
// Phase 2 scope: habit cards, tap-to-complete, empty states, polling
// Phase 3 scope: progress bar, confetti, history chart, tab-visibility pause
// Phase 4 scope: @dnd-kit drag-and-drop reordering with auto-scroll + touch
// ============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import { AnimatePresence, motion } from 'framer-motion';

// ---------------------------------------------------------------------------
// Types (mirrored from server schema for client-side typing)
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
// API helpers (native fetch, no external deps)
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

async function fetchReorder(profileId: string, orderedHabitIds: number[]): Promise<void> {
  const res = await fetch('/api/habits/reorder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile_id: parseInt(profileId), orderedHabitIds }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(body.error || 'Reorder failed');
  }
}

// ---------------------------------------------------------------------------
// Drag-and-drop sensor configuration
// Spec §3: TouchSensor with delay: 250ms, tolerance: 5px so normal scrolling
// isn't hijacked. MouseSensor for desktop. Auto-scroll is built into DndContext.
// ---------------------------------------------------------------------------

function useAppSensors() {
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: { delay: 250, tolerance: 5 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 250, tolerance: 5 },
  });
  const keyboardSensor = useSensor(KeyboardSensor, {});

  return useSensors(mouseSensor, touchSensor, keyboardSensor);
}

// ---------------------------------------------------------------------------
// SortableHabitCard — inline drag-and-drop card (avoids circular imports)
// ---------------------------------------------------------------------------

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableHabitCard({
  habit,
  onToggle,
}: {
  habit: HabitItem;
  onToggle: (habitId: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: habit.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
    zIndex: isDragging ? 1000 : undefined,
  };

  const isCompleted = habit.is_completed_today;

  return (
    <div ref={setNodeRef} style={style}>
      <motion.button
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => onToggle(habit.id)}
        {...attributes}
        {...listeners}
        className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
          isCompleted
            ? 'border-green-500/30 bg-green-500/10'
            : 'border-glass-border bg-glass/30 hover:border-accent-blue/30'
        }`}
      >
        {/* Drag handle */}
        <div className="flex h-6 w-6 flex-shrink-0 cursor-grab items-center justify-center rounded-full border border-gray-600 active:cursor-grabbing">
          <span className="text-xs text-gray-400">&#9776;</span>
        </div>

        {/* Completion indicator */}
        <div
          className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border ${
            isCompleted ? 'border-green-400 bg-green-400 text-white' : 'border-gray-500'
          }`}
        >
          {isCompleted && <span className="text-sm">&#10003;</span>}
        </div>

        {/* Emoji */}
        <span className="text-xl">{habit.emoji}</span>

        {/* Text + Points */}
        <div className="flex-1">
          <span
            className={`block text-sm ${isCompleted ? 'line-through text-gray-400' : 'text-gray-100'}`}
          >
            {habit.text}
          </span>
          <span className="text-xs text-accent-blue">{habit.points} pts</span>
        </div>
      </motion.button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// HabitBoard — Main component with completed/active sections
// ---------------------------------------------------------------------------

interface HabitBoardProps {
  profileId: string;
}

export default function HabitBoard({ profileId }: HabitBoardProps) {
  const queryClient = useQueryClient();
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef<{
    activeId: number;
    previousOrder: HabitItem[];
  } | null>(null);

  // Tab visibility tracking for polling pause
  const [isTabVisible, setIsTabVisible] = useState(true);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Fetch habits for this profile (polls every 15s, refetches on window focus)
  // Paused during drag or when tab is not visible
  const { data: habits = [], isLoading, error } = useQuery({
    queryKey: ['habits', profileId],
    queryFn: () => fetchHabits(profileId),
    refetchInterval: (!isTabVisible || isDragging) ? false : 15000,
    refetchOnWindowFocus: true,
  });

  // Fetch progress for confetti guard tracking
  const { data: progress } = useQuery({
    queryKey: ['progress', profileId],
    queryFn: () => fetch(`/api/habits/progress?profileId=${profileId}`).then((r) => r.json()),
    refetchInterval: (!isTabVisible || isDragging) ? false : 15000,
  });

  // Track progress state changes for confetti trigger
  const [prevProgressBelowTarget, setPrevProgressBelowTarget] = useState(true);
  const [currentProgressIsMet, setCurrentProgressIsMet] = useState(false);

  useEffect(() => {
    if (!progress) return;
    const isMet = progress.isTargetMet && !progress.hasZeroTarget;
    if (prevProgressBelowTarget && isMet) {
      setCurrentProgressIsMet(true);
    } else if (!isMet) {
      setPrevProgressBelowTarget(false);
      setCurrentProgressIsMet(false);
    }
  }, [progress, prevProgressBelowTarget]);

  // Toggle completion mutation with optimistic updates
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
    },
  });

  // Reorder mutation — POSTs ordered habit IDs to the server
  const reorderMutation = useMutation({
    mutationFn: () => {
      if (!dragStateRef.current) return Promise.resolve();
      return fetchReorder(profileId, dragStateRef.current.previousOrder.map((h) => h.id));
    },
    onSuccess: () => {
      // Invalidate and refetch fresh data from server
      void queryClient.invalidateQueries({ queryKey: ['habits', profileId] });
      dragStateRef.current = null;
    },
    onError: () => {
      // Revert to previous order on failure — the optimistic state will be
      // overwritten by the next poll/invalidation which fetches fresh server data
      dragStateRef.current = null;
    },
  });

  // Handle drag start — pause polling, capture previous order for rollback
  const handleDragStart = useCallback((): void => {
    setIsDragging(true);
    void queryClient.cancelQueries({ queryKey: ['habits', profileId] });
  }, [queryClient, profileId]);

  // Handle drag end — compute new order and POST to server
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setIsDragging(false);
      void queryClient.invalidateQueries({ queryKey: ['habits', profileId] });

      if (!dragStateRef.current) return;

      const { active, over } = event;
      if (!active || !over) {
        dragStateRef.current = null;
        return;
      }

      // Only reorder if the habit actually moved to a different position
      if (String(active.id) !== String(over.id)) {
        reorderMutation.mutate();
      } else {
        dragStateRef.current = null;
      }
    },
    [queryClient, profileId]
  );

  // Handle drag cancel — revert any pending changes
  const handleDragCancel = useCallback(() => {
    setIsDragging(false);
    void queryClient.invalidateQueries({ queryKey: ['habits', profileId] });
    dragStateRef.current = null;
  }, [queryClient, profileId]);

  // Handle tap-to-complete
  const handleToggle = (habitId: number) => {
    toggleMutation.mutate(habitId);
  };

  if (isLoading) {
    return <div className="text-center py-8 text-gray-400">Loading habits...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="mb-2 text-red-400">Failed to load habits.</p>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['habits', profileId] })}
          className="rounded bg-accent-blue px-3 py-1 text-sm text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  // Split into completed vs active — only active habits are sortable
  const completed = habits.filter((h) => h.is_completed_today);
  const active = habits.filter((h) => !h.is_completed_today);

  // Determine the order list for SortableContext: use drag state if active,
  // otherwise fall back to server data (active habits only)
  const sortableItems = dragStateRef.current ? dragStateRef.current.previousOrder : active;

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <DailyProgress profileId={profileId} />

      {/* Confetti celebration (hidden component, fires on target met) */}
      <ConfettiCelebration
        isTargetMet={currentProgressIsMet}
        wasPreviouslyBelowTarget={prevProgressBelowTarget}
        profileId={profileId}
      />

      {/* Active habits — wrapped in DndContext for drag-and-drop */}
      {active.length > 1 ? (
        <DndContext
          collisionDetection={closestCenter}
          sensors={useAppSensors()}
          modifiers={[restrictToWindowEdges]}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext items={sortableItems.map((h) => h.id)} strategy={verticalListSortingStrategy}>
            {active.length > 0 && (
              <section>
                <h2 className="mb-3 text-lg font-semibold text-gray-100">Active ({active.length})</h2>
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {sortableItems.map((habit) => (
                      <SortableHabitCard key={habit.id} habit={habit} onToggle={handleToggle} />
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )}
          </SortableContext>
        </DndContext>
      ) : (
        // Single or zero active habits — no drag-and-drop needed
        <section>
          <h2 className="mb-3 text-lg font-semibold text-gray-100">Active ({active.length})</h2>
          {active.length > 0 ? (
            <div className="space-y-2">
              {active.map((habit) => (
                <SortableHabitCard key={habit.id} habit={habit} onToggle={handleToggle} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">No active habits yet. Create one above!</p>
          )}
        </section>
      )}

      {/* Completed section */}
      {completed.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-green-400">
            &#10003; Completed ({completed.length})
          </h2>
          <div className="space-y-2">
            {completed.map((habit) => (
              <HabitCard key={habit.id} habit={habit} onToggle={handleToggle} />
            ))}
          </div>
        </section>
      )}

      {/* History chart */}
      <HistoryChart profileId={profileId} days={30} />

      {/* Empty state — no habits at all */}
      {habits.length === 0 && (
        <div className="rounded-xl border border-dashed border-glass-border p-8 text-center">
          <p className="text-gray-400">No habits yet. Add your first habit to get started!</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Re-export components that are used by the parent page for error boundaries
// ---------------------------------------------------------------------------

import DailyProgress from './DailyProgress';
import ConfettiCelebration from './ConfettiCelebration';
import HistoryChart from './HistoryChart';
import HabitCard from './HabitCard';