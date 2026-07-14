'use client';

// ============================================================================
// DailyProgress — Elegant progress bar + streak display (no frame)
// ============================================================================

import { useQuery } from '@tanstack/react-query';

interface ProgressData {
  current: number;
  target: number;
  percentage: number;
  isTargetMet: boolean;
  hasZeroTarget: boolean;
  streak: number;
}

interface DailyProgressProps {
  profileId: string;
}

async function fetchProgress(profileId: string): Promise<ProgressData> {
  const res = await fetch(`/api/habits/progress?profileId=${profileId}`);
  if (!res.ok) throw new Error('Failed to fetch progress');
  return res.json();
}

export default function DailyProgress({ profileId }: DailyProgressProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['progress', profileId],
    queryFn: () => fetchProgress(profileId),
    refetchInterval: 15000,
  });

  if (isLoading) {
    return (
      <div className="px-4 py-3">
        <div className="skeleton h-2 w-24 rounded-full mb-2" />
        <div className="skeleton h-1.5 w-full rounded-full" />
      </div>
    );
  }

  if (!data) return null;

  if (data.hasZeroTarget) {
    return (
      <div className="px-4 py-3">
        <p className="text-xs text-gray-500/80">
          Set a daily point target in Settings.
        </p>
      </div>
    );
  }

  const barWidth = Math.min(data.percentage, 100);
  const isComplete = data.isTargetMet;
  const streak = data.streak ?? 0;

  return (
    <div className="px-4 py-3">
      {/* Header: label + streak + points */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-white/60">Progress</span>
        <div className="flex items-center gap-2">
          {streak > 0 && (
            <span className="inline-flex items-center rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-semibold text-orange-400">
              🔥 {streak}
            </span>
          )}
          <span
            className={`text-xs font-bold tabular-nums ${
              isComplete ? 'text-green-400' : 'text-white/80'
            }`}
          >
            {data.current}/{data.target}
          </span>
        </div>
      </div>

      {/* Progress bar track — no border, no background card */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${
            isComplete
              ? 'bg-gradient-to-r from-green-400 to-emerald-400'
              : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500'
          }`}
          style={{ width: `${barWidth}%` }}
        />
      </div>

      {/* Percentage */}
      <div className="mt-1.5 text-right">
        <span className={`text-[10px] font-medium ${isComplete ? 'text-green-400/80' : 'text-white/40'}`}>
          {Math.round(data.percentage)}%
        </span>
      </div>

      {/* Target met celebration */}
      {isComplete && (
        <div className="mt-2 text-center">
          <p className="text-xs font-medium text-green-400/90">
            ✨ Daily target reached!{streak > 0 ? ` ${streak} day streak!` : ''}
          </p>
        </div>
      )}
    </div>
  );
}