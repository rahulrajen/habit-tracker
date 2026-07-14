'use client';

// ============================================================================
// HistoryPopout — iOS-style floating modal panel
// Contains streak stats + 30-day history chart
// Glassmorphic design: scale/fade pop-in instead of slide from right
// ============================================================================

import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import HistoryChart from './HistoryChart';

interface HistoryPopoutProps {
  profileId: string;
  show: boolean;
  onClose: () => void;
}

export default function HistoryPopout({ profileId, show, onClose }: HistoryPopoutProps) {
  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop — subtle dim */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[199] bg-black/30 backdrop-blur-sm"
          />

          {/* Popout panel — iOS-style center pop */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300, mass: 0.8 }}
            className="fixed left-1/2 top-20 z-[200] w-[400px] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-2xl"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-xs text-gray-400 transition-all hover:bg-white/10 hover:text-white"
              aria-label="Close history"
            >
              ✕
            </button>

            {/* Title */}
            <h3 className="mb-4 text-base font-semibold text-gray-100 pr-8">
              Activity & Streak
            </h3>

            {/* Stats row */}
            <HistoryStats profileId={profileId} />

            {/* Divider */}
            <div className="my-4 border-t border-white/8" />

            {/* Chart */}
            <HistoryChart profileId={profileId} days={30} height={200} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// HistoryStats — Streak and summary stats
// ---------------------------------------------------------------------------

function HistoryStats({ profileId }: { profileId: string }) {
  return (
    <div className="grid grid-cols-3 gap-3 mb-2">
      {/* Current streak */}
      <StatCard label="Streak" queryKey={['historyPopout_streak', profileId]} fetchFn={async () => {
        const res = await fetch(`/api/habits/progress?profileId=${profileId}`);
        if (!res.ok) return '—';
        const data = await res.json();
        // Ensure we extract just the number from the response object
        const streakVal = typeof data?.streak === 'number' ? data.streak : 0;
        return `🔥 ${streakVal}`;
      }} />

      {/* Today's progress */}
      <StatCard label="Today" queryKey={['historyPopout_today', profileId]} fetchFn={async () => {
        const res = await fetch(`/api/habits/progress?profileId=${profileId}`);
        if (!res.ok) return '—';
        const data = await res.json();
        const cur = typeof data?.current === 'number' ? data.current : 0;
        const tgt = typeof data?.target === 'number' ? data.target : 0;
        return `${cur}/${tgt}`;
      }} />

      {/* Total habits */}
      <StatCard label="Habits" queryKey={['historyPopout_habits', profileId]} fetchFn={async () => {
        const res = await fetch(`/api/habits?profileId=${profileId}`);
        if (!res.ok) return 0;
        const data = await res.json();
        const count = Array.isArray(data) ? data.length : 0;
        return String(count);
      }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatCard — Generic stat display with query fetch
// Ensures value is always a string before rendering
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string;
  queryKey: string[];
  fetchFn: () => Promise<string | number>;
}

function StatCard({ label, queryKey, fetchFn }: StatCardProps) {
  const { data } = useQuery({
    queryKey,
    queryFn: fetchFn,
    refetchInterval: 15000,
  });

  // Coerce to string for safe React rendering
  const displayValue = typeof data === 'object' && data !== null
    ? JSON.stringify(data)
    : String(data ?? '—');

  return (
    <div className="rounded-xl border border-white/8 bg-white/5 px-3 py-2 text-center">
      <p className="mb-0.5 text-[10px] uppercase tracking-wider text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-gray-200 tabular-nums">{displayValue}</p>
    </div>
  );
}