'use client';

// ============================================================================
// HistoryPopout — iOS-style floating modal panel
// Contains streak stats + 30-day history chart
// Glassmorphic design: scale/fade pop-in instead of slide from right
// Responsive: scrollable centered modal on mobile/iPad, fixed top panel on PC
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

          {/* Popout panel — responsive across devices */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300, mass: 0.8 }}
            className="fixed left-1/2 top-1/2 z-[200] w-[95vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/10 bg-white/5 max-h-[90vh] overflow-y-auto p-3 shadow-2xl backdrop-blur-2xl sm:p-4 md:top-16 md:max-w-md md:-translate-y-0 md:max-h-none md:overflow-visible md:p-5 lg:max-w-lg"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-2 right-2 z-[201] flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-xs text-gray-400 transition-all hover:bg-white/10 hover:text-white sm:top-3 sm:right-3"
              aria-label="Close history"
            >
              ✕
            </button>

            {/* Title */}
            <h3 className="mb-2 pr-8 text-base font-semibold text-gray-100 sm:mb-3 md:mb-4">
              Activity & Streak
            </h3>

            {/* Stats row — responsive padding */}
            <div className="grid grid-cols-3 gap-2 mb-2 sm:gap-3 sm:mb-3">
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

            {/* Divider */}
            <div className="my-3 border-t border-white/8 sm:my-4" />

            {/* Chart — responsive height per breakpoint */}
            <div className="h-28 sm:h-[160px] md:h-[180px] lg:h-[200px]">
              <HistoryChart profileId={profileId} days={30} height={140} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
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
    <div className="rounded-xl border border-white/8 bg-white/5 px-2 py-1.5 text-center sm:px-3 sm:py-2">
      <p className="mb-0.5 text-[9px] uppercase tracking-wider text-gray-500 sm:text-[10px]">{label}</p>
      <p className="text-xs font-semibold text-gray-200 tabular-nums sm:text-sm">{displayValue}</p>
    </div>
  );
}