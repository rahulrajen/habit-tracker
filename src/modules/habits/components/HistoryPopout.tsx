'use client';

// ============================================================================
// HistoryPopout — iOS-style floating panel that slides in from right
// Contains streak stats + 30-day history chart
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
            className="fixed inset-0 z-[199] bg-black/20"
          />

          {/* Popout panel — slides from right */}
          <motion.div
            initial={{ x: 420, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 420, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300, mass: 0.8 }}
            className="fixed right-4 top-20 z-[200] w-[380px] max-w-[calc(100vw-2rem)] rounded-2xl border border-white/12 bg-gray-900/85 p-5 shadow-2xl backdrop-blur-2xl"
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
      <StatCard label="Streak" queryKey={['streak', profileId]} fetchFn={async (_id) => {
        const res = await fetch(`/api/habits/progress?profileId=${_id}`);
        if (!res.ok) return 0;
        const data = await res.json();
        return `🔥 ${data.streak ?? 0}`;
      }} />

      {/* Today's progress */}
      <StatCard label="Today" queryKey={['progress', profileId]} fetchFn={async (_id) => {
        const res = await fetch(`/api/habits/progress?profileId=${_id}`);
        if (!res.ok) return '—';
        const data = await res.json();
        return `${data.current ?? 0}/${data.target ?? 0}`;
      }} />

      {/* Total habits */}
      <StatCard label="Habits" queryKey={['habits', profileId]} fetchFn={async (_id) => {
        const res = await fetch(`/api/habits?profileId=${_id}`);
        if (!res.ok) return 0;
        const data = await res.json();
        return Array.isArray(data) ? data.length : 0;
      }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatCard — Generic stat display with query fetch
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string;
  queryKey: string[];
  fetchFn: (id: string) => Promise<string | number>;
}

function StatCard({ label, queryKey, fetchFn }: StatCardProps) {
  const { data } = useQuery({
    queryKey,
    queryFn: () => fetchFn(_getProfileId(queryKey)),
    refetchInterval: 15000,
  });

  return (
    <div className="rounded-xl border border-white/8 bg-white/5 px-3 py-2 text-center">
      <p className="mb-0.5 text-[10px] uppercase tracking-wider text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-gray-200 tabular-nums">{data ?? '—'}</p>
    </div>
  );
}

function _getProfileId(key: string[]): string {
  return key[key.length - 1] as string;
}