// ============================================================================
// HabitCard — Single habit card with tap-to-complete animation
// Post-Go-Live v4: No checkbox/points input, just emoji + text + points
// Full card is clickable to toggle completion status
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
      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left backdrop-blur-md transition-all duration-200 ${
        isCompleted
          ? 'border-green-500/30 bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.1)]'
          : 'border-white/10 bg-white/5 hover:border-indigo-400/40 hover:bg-white/10 hover:shadow-[0_4px_20px_rgba(99,102,241,0.15)]'
      }`}
    >
      {/* Emoji */}
      <span className="text-xl flex-shrink-0">{habit.emoji}</span>

      {/* Text + Points */}
      <div className="flex-1 min-w-0">
        <span
          className={`block text-sm ${isCompleted ? 'line-through text-gray-500' : 'text-gray-100'}`}
        >
          {habit.text}
        </span>
        <span className="text-xs text-indigo-400">{habit.points} pts</span>
      </div>

      {/* Completion indicator — small checkmark on the right */}
      <div
        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border transition-colors ${
          isCompleted
            ? 'border-green-400 bg-green-400 text-white shadow-[0_0_8px_rgba(34,197,94,0.4)]'
            : 'border-transparent'
        }`}
      >
        {isCompleted && <span className="text-xs">&#10003;</span>}
      </div>
    </motion.button>
  );
}