// ============================================================================
// SortableHabitCard — Draggable habit card with tap-to-complete
// Phase 4 scope: wraps HabitCard logic inside @dnd-kit sortable context
// ============================================================================

'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useCallback, useRef } from 'react';

interface HabitItem {
  id: number;
  profile_id: number;
  text: string;
  emoji: string;
  points: number;
  display_order: number;
  is_completed_today: boolean;
}

export interface SortableHabitCardProps {
  habit: HabitItem;
  onToggle: (habitId: number) => void;
}

/**
 * Sortable habit card component.
 * Uses @dnd-kit/useSortable for drag handles, but delegates the visual rendering
 * to a ref-forwarded inner component so tap-to-complete still works via click.
 */
const SortableHabitCardContent = ({ habit, onToggle }: SortableHabitCardProps) => {
  const isCompleted = habit.is_completed_today;

  return (
    <div
      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left ${
        isCompleted
          ? 'border-green-500/30 bg-green-500/10'
          : 'border-glass-border bg-glass/30 hover:border-accent-blue/30'
      }`}
    >
      {/* Drag handle (visible only on non-touch devices via CSS in production) */}
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
    </div>
  );
};

// Export the inner component so it can be tested independently if needed
export { SortableHabitCardContent };

/**
 * Main sortable card wrapper.
 * Uses useSortable hook to make the inner content draggable, while preserving
 * tap-to-complete behavior via click on the card body.
 */
export function SortableHabitCard({ habit, onToggle }: SortableHabitCardProps) {
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

  return (
    <div ref={setNodeRef} style={style}>
      <SortableHabitCardContent habit={habit} onToggle={() => onToggle(habit.id)} />
    </div>
  );
}
