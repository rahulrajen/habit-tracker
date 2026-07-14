'use client';

// ============================================================================
// HistoryChart — Recharts line chart showing points earned per day
// Phase 3 scope: 30-day default, filtered by profile, computed from completions
// ============================================================================

import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface HistoryPoint {
  date: string; // YYYY-MM-DD
  points: number;
}

interface HistoryChartProps {
  profileId: string;
  days?: number; // default 30
  height?: number; // default 240
}

async function fetchHistory(profileId: string, days: number): Promise<HistoryPoint[]> {
  const res = await fetch(`/api/habits/history?profileId=${profileId}&days=${days}`);
  if (!res.ok) throw new Error('Failed to fetch history');
  return res.json();
}

/** Format a YYYY-MM-DD date string for display (e.g. "Jul 12") */
function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function HistoryChart({ profileId, days = 30, height = 240 }: HistoryChartProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['history', profileId, days],
    queryFn: () => fetchHistory(profileId, days),
    refetchInterval: 15000, // Sync with habit polling interval
  });

  if (isLoading) {
    return <div className="h-[240px] animate-pulse rounded bg-surface-light/30" />;
  }

  const chartData = data ?? [];

  // Check if there's any data at all (all zeros)
  const hasAnyActivity = chartData.some((d) => d.points > 0);

  if (!hasAnyActivity && chartData.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-glass-border bg-surface-light/20 p-8">
        <p className="text-center text-sm text-gray-400">No history yet. Complete some habits to see your progress!</p>
      </div>
    );
  }

  if (!hasAnyActivity) {
    return (
      <div className="rounded-xl border border-dashed border-glass-border bg-surface-light/20 p-8">
        <p className="text-center text-sm text-gray-400">No activity in the last {days} days.</p>
      </div>
    );
  }

  // Format data for Recharts with readable date labels
  const formattedData = chartData.map((d) => ({
    ...d,
    label: formatDate(d.date),
  }));

  return (
    <div className="rounded-xl border border-dashed border-glass-border bg-surface-light/20 p-4">
      {/* Header */}
      <h3 className="mb-4 text-lg font-semibold text-gray-100">
        Points History ({days} days)
      </h3>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={formattedData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis
            dataKey="label"
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            ticks={[formattedData[0]?.label, formattedData[Math.floor(formattedData.length / 2)]?.label, formattedData[formattedData.length - 1]?.label]}
          />
          <YAxis
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(30, 41, 59, 0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#f3f4f6',
              fontSize: '12px',
            }}
            formatter={(value: number) => [`${value} points`]}
            labelFormatter={(label) => `📅 ${label}`}
          />
          <Line
            type="monotone"
            dataKey="points"
            stroke="#6366f1"
            strokeWidth={2}
            dot={{ fill: '#a855f7', strokeWidth: 2, r: 3 }}
            activeDot={{ r: 5, fill: '#a855f7' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}