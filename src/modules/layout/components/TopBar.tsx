'use client';

// ============================================================================
// TopBar — Responsive header with date, profile dropdown, settings, add-habit, streak
// Designed for Samsung Galaxy Fold (280px–768px) and up
// ============================================================================

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useState, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Profile {
  id: number;
  name: string;
  emoji: string;
  target_points: number;
}

interface StreakData {
  streak: number;
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function fetchProfiles(): Promise<Profile[]> {
  const res = await fetch('/api/profiles');
  if (!res.ok) throw new Error('Failed to fetch profiles');
  return res.json();
}

async function fetchStreak(profileId: string): Promise<StreakData> {
  const res = await fetch(`/api/habits/progress?profileId=${profileId}`);
  if (!res.ok) throw new Error('Failed to fetch streak');
  const data = await res.json();
  return { streak: data.streak ?? 0 };
}

// ---------------------------------------------------------------------------
// TopBar component
// ---------------------------------------------------------------------------

interface TopBarProps {
  currentProfileId: string;
  onAddHabit: () => void;
  onShowHistory?: () => void;
  showCreateForm?: boolean;
  onCreateFormCancel?: () => void;
}

export default function TopBar({ currentProfileId, onAddHabit, onShowHistory, showCreateForm, onCreateFormCancel }: TopBarProps) {
  const [newHabitText, setNewHabitText] = useState('');
  const [newHabitEmoji, setNewHabitEmoji] = useState('\u{1F4AA}');
  const [newHabitPoints, setNewHabitPoints] = useState<number>(1);

  async function handleCreateHabit() {
    if (!newHabitText.trim()) return;
    try {
      const res = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_id: parseInt(currentProfileId, 10),
          text: newHabitText.trim(),
          emoji: newHabitEmoji,
          points: newHabitPoints,
        }),
      });
      if (!res.ok) throw new Error('Create failed');
      // Reset form and close
      setNewHabitText('');
      setNewHabitEmoji('\u{1F4AA}');
      setNewHabitPoints(1);
      onCreateFormCancel?.();
      // Refetch queries
      await fetch(`/api/habits?profileId=${currentProfileId}`);
    } catch {
      // Ignore creation errors — show nothing for now
    }
  }
  const router = useRouter();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: fetchProfiles,
    staleTime: 30000,
  });

  const { data: streakData } = useQuery({
    queryKey: ['streak', currentProfileId],
    queryFn: () => fetchStreak(currentProfileId),
    staleTime: 60000,
  });

  const handleProfileChange = useCallback((id: string) => {
    setShowProfileDropdown(false);
    router.push(`/profiles/${id}`);
  }, [router]);

  const currentProfile = profiles.find((p) => p.id.toString() === currentProfileId);

  return (
    <header className="w-full">
      {/* Top navigation — frosted glass bar */}
      <nav className="glass-card flex items-center justify-between px-4 py-2.5 backdrop-blur-xl">
        {/* Left: Profile selector */}
        <div className="relative">
          <button
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-all hover:bg-white/10"
            aria-label="Select profile"
          >
            {currentProfile?.emoji && <span className="text-lg">{currentProfile.emoji}</span>}
            <span className="text-sm font-medium text-gray-100 max-[480px]:hidden">
              {currentProfile?.name || 'Profile'}
            </span>
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown menu */}
          {showProfileDropdown && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowProfileDropdown(false)}
              />
              {/* Menu */}
              <div className="absolute left-0 z-[100] mt-1 min-w-[200px] rounded-xl border border-white/20 bg-gray-900/90 py-2 backdrop-blur-2xl shadow-2xl">
                {profiles.map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => handleProfileChange(profile.id.toString())}
                    className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-all hover:bg-white/10 ${
                      profile.id.toString() === currentProfileId
                        ? 'text-indigo-300'
                        : 'text-gray-200'
                    }`}
                  >
                    <span className="text-base">{profile.emoji}</span>
                    <span className="flex-1">{profile.name}</span>
                    {profile.id.toString() === currentProfileId && (
                      <span className="text-xs text-indigo-400">Active</span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Streak badge — hidden on very small screens */}
          {streakData && streakData.streak > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2 py-1 text-xs font-medium text-orange-400 border border-orange-500/20">
              &#128293; {streakData.streak}
            </span>
          )}

          {/* History button */}
          <button
            onClick={() => onShowHistory?.()}
            className="rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:text-white"
            aria-label="View history"
          >
            <span className="flex items-center gap-1">
              <span>📊</span>
              <span className="max-[480px]:hidden">History</span>
            </span>
          </button>

          {/* Add Habit button — icon only on small screens */}
          <button
            onClick={onAddHabit}
            className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${
              showCreateForm
                ? 'border-indigo-400/40 bg-indigo-500/10 text-indigo-300'
                : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:text-white'
            } ${showCreateForm ? '' : 'max-[480px]:px-2 max-[480px]:py-1.5'}`}
            aria-label="Add habit"
          >
            <span className="flex items-center gap-1">
              <span>&#43;</span>
              <span className="max-[480px]:hidden">Habit</span>
            </span>
          </button>

          {/* Settings — icon only on small screens */}
          <button
            onClick={() => router.push(`/profiles/${currentProfileId}/settings`)}
            className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-gray-400 hover:border-white/20 hover:text-white transition-all"
            aria-label="Settings"
          >
            <span className="text-base">&#9881;&#65039;</span>
          </button>
        </div>
      </nav>

      {/* Habit Creation Form — shown when triggered from TopBar button */}
      {showCreateForm && (
        <div className="mx-4 mt-3 glass-card p-4 sm:p-5 backdrop-blur-xl space-y-3 sm:space-y-4 animate-slideDown">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-200">New Habit</h3>
            <button
              onClick={onCreateFormCancel}
              className="rounded-lg px-2 py-1 text-xs text-gray-400 hover:bg-white/10 hover:text-white transition-all"
            >
              ✕
            </button>
          </div>

          {/* Emoji picker */}
          <div>
            <label className="mb-2 block text-xs font-medium text-gray-400">Icon</label>
            <div className="flex flex-wrap gap-1.5">
              {['\u{1F4AA}', '\u{1F3C3}', '\u{1F4DA}', '\u{1F3B5}', '\u{1F3A8}', '\u{1F4DD}', '\u{1F331}', '\u{1F6B4}', '\u{1F3CA}', '\u{1F93D}', '\u{1F9D8}', '\u{2615}', '\u{1F4A7}', '\u{1F34E}', '\u{1F4A4}', '\u{1F514}', '\u{1F4AC}', '\u{2764}', '\u{2B50}', '\u{1F3AF}'].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setNewHabitEmoji(emoji)}
                  className={`w-9 h-9 rounded-lg text-base flex items-center justify-center transition-all ${
                    newHabitEmoji === emoji
                      ? 'bg-indigo-500/20 ring-2 ring-indigo-400 scale-110'
                      : 'bg-white/5 border border-white/10 hover:border-white/20'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Habit name + points in a row */}
          <div className="flex gap-3">
            <input
              type="text"
              maxLength={128}
              value={newHabitText}
              onChange={(e) => setNewHabitText(e.target.value)}
              placeholder="e.g. Morning workout..."
              className="glass-input flex-1"
              autoFocus
            />
            <input
              type="number"
              min={1}
              max={100}
              value={newHabitPoints}
              onChange={(e) =>
                setNewHabitPoints(Math.max(1, parseInt(e.target.value, 10) || 1))
              }
              className="glass-input w-20 text-center"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleCreateHabit}
              disabled={!newHabitText.trim()}
              className="flex-1 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-400 hover:to-purple-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Habit
            </button>
            <button
              onClick={() => {
                setNewHabitText('');
                onCreateFormCancel?.();
              }}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-white/10 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
