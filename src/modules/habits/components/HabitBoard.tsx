'use client';

// ============================================================================
// HabitBoard — Client component: habits with drag-and-drop, completion toggle
// Post-Go-Live v3: Accepts optional creation form control from parent
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
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type React from 'react';

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
// Emoji picker data
// ---------------------------------------------------------------------------

const HABIT_EMOJIS = [
  '\u{1F4AA}', '\u{1F3C3}', '\u{1F4DA}', '\u{1F3B5}', '\u{1F3A8}',
  '\u{1F4DD}', '\u{1F331}', '\u{1F6B4}', '\u{1F3CA}', '\u{1F93D}',
  '\u{1F9D8}', '\u{1F4AA}', '\u{2615}', '\u{1F4A7}', '\u{1F34E}',
  '\u{1F4A4}', '\u{1F514}', '\u{1F4AC}', '\u{2764}', '\u{2B50}',
];

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

async function createHabit(data: {
  profile_id: number;
  text: string;
  emoji: string;
  points: number;
}): Promise<HabitItem> {
  const res = await fetch('/api/habits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(body.error || 'Create failed');
  }
  return res.json();
}

async function fetchReorder(profileId: string, orderedHabitIds: number[]): Promise<void> {
  const res = await fetch('/api/habits/reorder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile_id: parseInt(profileId, 10), orderedHabitIds }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(body.error || 'Reorder failed');
  }
}

// ---------------------------------------------------------------------------
// Helper: reorder an array by moving one item to another position
// ---------------------------------------------------------------------------

function reorderArray<T>(list: T[], startIndex: number, endIndex: number): T[] {
  const result = [...list];
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
}

// ---------------------------------------------------------------------------
// Drag-and-drop sensor configuration
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
// SortableHabitCard
// ---------------------------------------------------------------------------

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
        className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left backdrop-blur-md transition-all duration-200 ${
          isCompleted
            ? 'border-green-500/30 bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.1)]'
            : 'border-white/10 bg-white/5 hover:border-indigo-400/40 hover:bg-white/10 hover:shadow-[0_4px_20px_rgba(99,102,241,0.15)]'
        }`}
      >
        <div className="flex h-6 w-6 flex-shrink-0 cursor-grab items-center justify-center rounded-full border border-white/10 active:cursor-grabbing">
          <span className="text-xs text-gray-500">&#9776;</span>
        </div>
        <div
          className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border transition-colors ${
            isCompleted
              ? 'border-green-400 bg-green-400 text-white shadow-[0_0_8px_rgba(34,197,94,0.4)]'
              : 'border-white/20'
          }`}
        >
          {isCompleted && <span className="text-sm">&#10003;</span>}
        </div>
        <span className="text-xl">{habit.emoji}</span>
        <div className="flex-1">
          <span
            className={`block text-sm ${isCompleted ? 'line-through text-gray-500' : 'text-gray-100'}`}
          >
            {habit.text}
          </span>
          <span className="text-xs text-indigo-400">{habit.points} pts</span>
        </div>
      </motion.button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// HabitBoard — Main component
// ---------------------------------------------------------------------------

interface HabitBoardProps {
  profileId: string;
}

export default function HabitBoard({ profileId }: HabitBoardProps) {
  const queryClient = useQueryClient();
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef<{ previousOrder: HabitItem[] } | null>(null);

  // Optimistic order during drag — applies immediately so card stays where dropped
  const [optimisticActive, setOptimisticActive] = useState<HabitItem[] | null>(null);

  // Habit creation form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newHabitText, setNewHabitText] = useState('');
  const [newHabitEmoji, setNewHabitEmoji] = useState('\u{1F4AA}');
  const [newHabitPoints, setNewHabitPoints] = useState<number>(1);

  // Tab visibility tracking
  const [isTabVisible, setIsTabVisible] = useState(true);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Sensors must be called unconditionally (React hooks rule)
  const sensors = useAppSensors();

  // Fetch habits
  const { data: habits = [], isLoading, error } = useQuery({
    queryKey: ['habits', profileId],
    queryFn: () => fetchHabits(profileId),
    refetchInterval: (!isTabVisible || isDragging) ? false : 15000,
    refetchOnWindowFocus: true,
  });

  // Fetch progress for confetti
  const { data: progress } = useQuery({
    queryKey: ['progress', profileId],
    queryFn: () => fetch(`/api/habits/progress?profileId=${profileId}`).then((r) => r.json()),
    refetchInterval: (!isTabVisible || isDragging) ? false : 15000,
  });

  // Confetti state tracking
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

  // Create habit mutation
  const createMutation = useMutation({
    mutationFn: createHabit,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['habits', profileId] });
      void queryClient.invalidateQueries({ queryKey: ['progress', profileId] });
      setShowCreateForm(false);
      setNewHabitText('');
      setNewHabitEmoji('\u{1F4AA}');
      setNewHabitPoints(1);
    },
  });

  // Reorder mutation
  const reorderMutation = useMutation({
    mutationFn: (orderedIds: number[]) => fetchReorder(profileId, orderedIds),
    onSuccess: () => {
      setOptimisticActive(null);
      dragStateRef.current = null;
      void queryClient.invalidateQueries({ queryKey: ['habits', profileId] });
    },
    onError: () => {
      // Revert optimistic order
      setOptimisticActive(null);
      dragStateRef.current = null;
      void queryClient.invalidateQueries({ queryKey: ['habits', profileId] });
    },
  });

  const handleDragStart = useCallback((): void => {
    setIsDragging(true);
    void queryClient.cancelQueries({ queryKey: ['habits', profileId] });
  }, [queryClient, profileId]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (!active || !over || String(active.id) === String(over.id)) {
        setIsDragging(false);
        return;
      }

      // Get current active habits (server state or already-optimized)
      const currentHabits = queryClient.getQueryData<HabitItem[]>(['habits', profileId]) ?? [];
      const activeHabits = currentHabits.filter((h) => !h.is_completed_today);

      const oldIndex = activeHabits.findIndex((h) => h.id === active.id);
      const newIndex = activeHabits.findIndex((h) => h.id === over.id);

      if (oldIndex === -1 || newIndex === -1) {
        setIsDragging(false);
        return;
      }

      // Compute new order by moving oldIndex → newIndex
      const reorderedActive = reorderArray(activeHabits, oldIndex, newIndex);

      // Merge back with completed habits (they stay in place)
      const completed = currentHabits.filter((h) => h.is_completed_today);
      const newAll = [...reorderedActive, ...completed];

      // Optimistic update — show new order immediately
      queryClient.setQueryData(['habits', profileId], newAll);
      setOptimisticActive(reorderedActive);

      // Send to server
      const orderedIds = reorderedActive.map((h) => h.id);
      dragStateRef.current = { previousOrder: activeHabits };
      reorderMutation.mutate(orderedIds);

      setIsDragging(false);
    },
    [queryClient, profileId, reorderMutation]
  );

  const handleDragCancel = useCallback(() => {
    setIsDragging(false);
    setOptimisticActive(null);
    dragStateRef.current = null;
  }, []);

  const handleToggle = (habitId: number) => {
    toggleMutation.mutate(habitId);
  };

  const handleCreateHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitText.trim()) return;
    createMutation.mutate({
      profile_id: parseInt(profileId, 10),
      text: newHabitText.trim(),
      emoji: newHabitEmoji,
      points: newHabitPoints,
    });
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

  // Use optimistic order if available, otherwise server data
  const displayActive = optimisticActive ?? active;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Progress bar */}
      <DailyProgress profileId={profileId} />

      {/* Confetti celebration */}
      <ConfettiCelebration
        isTargetMet={currentProgressIsMet}
        profileId={profileId}
      />

      {/* Habit Creation Form (collapsible) — shown when toggled from TopBar */}
      {showCreateForm && (
        <div className="glass-card p-4 sm:p-5 backdrop-blur-xl space-y-3 sm:space-y-4">
          <form onSubmit={handleCreateHabit} className="space-y-3 sm:space-y-4">
            {/* Emoji picker */}
            <div>
              <label className="mb-2 block text-xs font-medium text-gray-400">Icon</label>
              <div className="flex flex-wrap gap-1.5">
                {HABIT_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setNewHabitEmoji(emoji)}
                    className={`w-9 h-9 rounded-lg text-base flex items-center justify-center transition-all ${
                      newHabitEmoji === emoji
                        ? 'bg-indigo-500/20 ring-2 ring-indigo-400 scale-110'
                        : 'bg-white/5 border border-white/10 hover:border-white/20'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Habit name + points in a row */}
            <div className="flex gap-3">
              <input
                type="text"
                maxLength={128}
                value={newHabitText}
                onChange={(e) => setNewHabitText(e.target.value)}
                placeholder="e.g. Morning workout..."
                className="glass-input flex-1"
                autoFocus
              />
              <input
                type="number"
                min={1}
                max={100}
                value={newHabitPoints}
                onChange={(e) =>
                  setNewHabitPoints(Math.max(1, parseInt(e.target.value, 10) || 1))
                }
                className="glass-input w-20 text-center"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createMutation.isPending || !newHabitText.trim()}
                className="flex-1 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-400 hover:to-purple-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Habit'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

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
      {displayActive.length > 1 ? (
        <DndContext
          collisionDetection={closestCenter}
          sensors={sensors}
          modifiers={[restrictToWindowEdges]}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext
            items={displayActive.map((h) => h.id)}
            strategy={verticalListSortingStrategy}
          >
            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Active ({displayActive.length})
              </h2>
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {displayActive.map((habit) => (
                    <SortableHabitCard key={habit.id} habit={habit} onToggle={handleToggle} />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          </SortableContext>
        </DndContext>
      ) : (
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Active ({displayActive.length})
          </h2>
          {displayActive.length > 0 ? (
            <div className="space-y-2">
              {displayActive.map((habit) => (
                <SortableHabitCard key={habit.id} habit={habit} onToggle={handleToggle} />
              ))}
            </div>
          ) : (
            !showCreateForm && (
              <div className="glass-card p-6 text-center backdrop-blur-md">
                <p className="text-sm text-gray-500">
                  {habits.length === 0
                    ? 'No habits yet. Tap "+ Habit" to get started!'
                    : 'All habits completed! Great job! 🎉'}
                </p>
              </div>
            )
          )}
        </section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Re-export components
// ---------------------------------------------------------------------------

import DailyProgress from './DailyProgress';
import ConfettiCelebration from './ConfettiCelebration';
import HabitCard from './HabitCard';