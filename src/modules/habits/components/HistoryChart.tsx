'use client';

// ============================================================================
// HistoryChart — Recharts line chart showing points earned per day
// Post-Go-Live: Enhanced glass styling, moved to settings page
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
  date: string;
  points: number;
}

interface HistoryChartProps {
  profileId: string;
  days?: number;
  height?: number;
}

async function fetchHistory(profileId: string, days: number): Promise<HistoryPoint[]> {
  const res = await fetch(`/api/habits/history?profileId=${profileId}&days=${days}`);
  if (!res.ok) throw new Error('Failed to fetch history');
  return res.json();
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function HistoryChart({ profileId, days = 30, height = 240 }: HistoryChartProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['history', profileId, days],
    queryFn: () => fetchHistory(profileId, days),
    refetchInterval: 15000,
  });

  if (isLoading) {
    return (
      <div className="glass-card p-5 backdrop-blur-xl">
        <div className="skeleton h-6 w-40 mb-4" />
        <div className="skeleton h-[240px] w-full rounded-xl" />
      </div>
    );
  }

  const chartData = data ?? [];
  const hasAnyActivity = chartData.some((d) => d.points > 0);

  if (!hasAnyActivity && chartData.length === 0) {
    return (
      <div className="glass-card p-8 text-center backdrop-blur-xl">
        <p className="text-sm text-gray-400">
          No history yet. Complete some habits to see your progress!
        </p>
      </div>
    );
  }

  if (!hasAnyActivity) {
    return (
      <div className="glass-card p-8 text-center backdrop-blur-xl">
        <p className="text-sm text-gray-400">No activity in the last {days} days.</p>
      </div>
    );
  }

  const formattedData = chartData.map((d) => ({
    ...d,
    label: formatDate(d.date),
  }));

  return (
    <div className="glass-card p-5 backdrop-blur-xl">
      <h3 className="mb-4 text-lg font-semibold text-gray-100">
        Points History ({days} days)
      </h3>

      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={formattedData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="label"
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            ticks={[
              formattedData[0]?.label,
              formattedData[Math.floor(formattedData.length / 2)]?.label,
              formattedData[formattedData.length - 1]?.label,
            ]}
          />
          <YAxis
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(19, 24, 39, 0.95)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              color: '#f3f4f6',
              fontSize: '12px',
              backdropFilter: 'blur(12px)',
            }}
            formatter={(value: number) => [`${value} points`]}
            labelFormatter={(label) => `📅 ${label}`}
          />
          <Line
            type="monotone"
            dataKey="points"
            stroke="#818cf8"
            strokeWidth={2.5}
            dot={{ fill: '#a78bfa', strokeWidth: 2, r: 3 }}
            activeDot={{ r: 5, fill: '#a78bfa', stroke: '#818cf8' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}