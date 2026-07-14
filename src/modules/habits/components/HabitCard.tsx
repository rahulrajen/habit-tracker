// ============================================================================
// HabitCard — Single habit card with tap-to-complete animation
// Extracted from HabitBoard to respect 150-line boundary (Pillar 1)
// ============================================================================

'use client';

import { motion } from 'framer-motion';

interface HabitItem {
  id: number;
  profile_id: number;
  text: string;
  emoji: string;
  points: number;
  display_order: number;
  is_completed_today: boolean;
}

export interface HabitCardProps {
  habit: HabitItem;
  onToggle: (habitId: number) => void;
}

export default function HabitCard({ habit, onToggle }: HabitCardProps) {
  const isCompleted = habit.is_completed_today;

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => onToggle(habit.id)}
      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
        isCompleted
          ? 'border-green-500/30 bg-green-500/10'
          : 'border-glass-border bg-glass/30 hover:border-accent-blue/30'
      }`}
    >
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
  );
}