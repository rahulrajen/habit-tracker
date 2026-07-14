'use client';

// ============================================================================
// DailyProgress — Progress bar showing current points vs target
// Phase 3 scope: renders progress bar with zero-target guard
// ============================================================================

import { useQuery } from '@tanstack/react-query';

interface ProgressData {
  current: number;
  target: number;
  percentage: number;
  isTargetMet: boolean;
  hasZeroTarget: boolean;
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
    refetchInterval: 15000, // Sync with habit polling interval
  });

  if (isLoading) {
    return <div className="h-8 animate-pulse rounded bg-surface-light/30" />;
  }

  if (!data) return null;

  // Zero-target guard: show message instead of broken bar
  if (data.hasZeroTarget) {
    return (
      <div className="rounded-xl border border-dashed border-glass-border bg-surface-light/20 p-4">
        <p className="text-sm text-gray-400 italic">No target set. Set a daily point target in your profile settings.</p>
      </div>
    );
  }

  const barWidth = Math.min(data.percentage, 100);
  const isComplete = data.isTargetMet;

  return (
    <div className="rounded-xl border border-dashed border-glass-border bg-surface-light/20 p-4">
      {/* Header: title + percentages */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-300">Daily Progress</span>
        <span className={`text-sm font-semibold ${isComplete ? 'text-green-400' : 'text-accent-blue'}`}>
          {data.current} / {data.target} points ({data.percentage}%)
        </span>
      </div>

      {/* Progress bar track */}
      <div className="h-3 w-full overflow-hidden rounded-full bg-gray-700">
        {/* Progress bar fill with gradient */}
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${isComplete ? 'bg-green-500' : 'bg-gradient-to-r from-accent-blue to-purple-500'}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>

      {/* Milestone markers */}
      <div className="mt-1 flex justify-between text-xs text-gray-500">
        <span>0</span>
        <span>{Math.round(data.target * 0.25)}</span>
        <span>{Math.round(data.target * 0.5)}</span>
        <span>{Math.round(data.target * 0.75)}</span>
        <span>{data.target}</span>
      </div>

      {/* Target met celebration text */}
      {isComplete && (
        <p className="mt-2 text-center text-sm font-medium text-green-400">
          &#127881; Target reached! Great job!
        </p>
      )}
    </div>
  );
}