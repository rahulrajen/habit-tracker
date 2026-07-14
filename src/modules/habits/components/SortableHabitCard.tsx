// ============================================================================
// SortableHabitCard — Draggable habit card with tap-to-complete
// Phase 4 scope: wraps HabitCard logic inside @dnd-kit sortable context
// ============================================================================

'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
 * Sortable habit card with drag handle using @dnd-kit/useSortable.
 * Tap-to-complete works via click on the card body.
 */
export function SortableHabitCard({ habit, onToggle }: SortableHabitCardProps) {
  const {
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
      <div
        onClick={() => onToggle(habit.id)}
        className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left ${
          isCompleted
            ? 'border-green-500/30 bg-green-500/10'
            : 'border-white/10 bg-white/5 hover:border-indigo-400/40 hover:bg-white/10'
        }`}
      >
        {/* Drag handle */}
        <div className="flex h-6 w-6 flex-shrink-0 cursor-grab items-center justify-center rounded-full border border-white/10 active:cursor-grabbing">
          <span className="text-xs text-gray-500">&#9776;</span>
        </div>

        {/* Completion indicator */}
        <div
          className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border transition-colors ${
            isCompleted
              ? 'border-green-400 bg-green-400 text-white shadow-[0_0_8px_rgba(34,197,94,0.4)]'
              : 'border-white/20'
          }`}
        >
          {isCompleted && <span className="text-sm">&#10003;</span>}
        </div>

        {/* Emoji */}
        <span className="text-xl">{habit.emoji}</span>

        {/* Text + Points */}
        <div className="flex-1">
          <span
            className={`block text-sm ${isCompleted ? 'line-through text-gray-500' : 'text-gray-100'}`}
          >
            {habit.text}
          </span>
          <span className="text-xs text-indigo-400">{habit.points} pts</span>
        </div>
      </div>
    </div>
  );
}
