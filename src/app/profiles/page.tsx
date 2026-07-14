'use client';

// ============================================================================
// /profiles — Empty-State Landing Page (Phase 5 Go-Live Fix)
// Post-Go-Live v2: ESLint fixes
// ============================================================================

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Profile {
  id: number;
  name: string;
  emoji: string;
  target_points: number;
  archived_at: Date | null;
  created_at: Date;
}

const PROFILE_EMOJIS = [
  '\u{1F464}',
  '\u{1F466}',
  '\u{1F467}',
  '\u{1F468}',
  '\u{1F469}',
  '\u{1F474}',
  '\u{1F475}',
  '\u{1F9D1}',
  '\u{1F9D2}',
  '\u{1F9D3}',
  '\u{1F476}',
  '\u{1F436}',
  '\u{1F431}',
  '\u{1F437}',
  '\u{1F438}',
  '\u{1F981}',
  '\u{1F426}',
  '\u{1F435}',
  '\u{1F4B0}',
  '\u{2B50}',
];

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Unknown error' }));
    const errorObj = Object.assign(new Error(body.error || 'Request failed'), { status: res.status });
    throw errorObj;
  }
  return res.json() as Promise<T>;
}

async function fetchProfiles(): Promise<Profile[]> {
  return apiFetch<Profile[]>('/api/profiles');
}

async function createProfile(data: { name: string; emoji: string; target_points: number }): Promise<Profile> {
  return apiFetch<Profile>('/api/profiles', { method: 'POST', body: JSON.stringify(data) });
}

export default function ProfilesPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState('\u{1F464}');
  const [name, setName] = useState('');
  const [dailyTarget, setDailyTarget] = useState<number | ''>(10);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProfiles()
      .then((data) => {
        setProfiles(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (profiles.length > 0 && !loading) {
      router.replace(`/profiles/${profiles[0].id}`);
    }
  }, [profiles, loading, router]);

  const handleCreate = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const newProfile = await createProfile({
        name: name.trim(),
        emoji: selectedEmoji,
        target_points: typeof dailyTarget === 'number' ? dailyTarget : 10,
      });
      try { localStorage.setItem('habit-tracker-active-profile-id', newProfile.id.toString()); } catch { /* noop */ }
      router.replace(`/profiles/${newProfile.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create profile');
      setCreating(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><p className="text-gray-400">Loading...</p></div>;
  }

  if (profiles.length > 0) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-dark px-4">
      <div className="glass-card p-6 text-center max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-100 mb-1">Welcome to Habit Tracker</h1>
        <p className="text-gray-400 mb-5 text-sm">Create your first profile to track habits.</p>
        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">{error}</div>
        )}
        {showCreateForm ? (
          <form onSubmit={handleCreate} className="space-y-4 text-left">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-300">Choose an Icon</label>
              <div className="flex flex-wrap gap-2 justify-center mb-2">
                {PROFILE_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setSelectedEmoji(emoji)}
                    className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${
                      selectedEmoji === emoji
                        ? 'bg-accent-blue/20 ring-2 ring-accent-blue scale-110'
                        : 'bg-surface-dark border border-glass-border hover:border-gray-500'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="profile-name" className="mb-1 block text-xs font-medium text-gray-300">Profile Name</label>
              <input
                id="profile-name"
                type="text"
                maxLength={64}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Parent 1, Kid A, etc."
                className="w-full rounded-md border border-glass-border bg-surface-dark px-3 py-2 text-sm text-gray-100 focus:border-accent-blue focus:outline-none"
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="daily-target" className="mb-1 block text-xs font-medium text-gray-300">Daily Target (points)</label>
              <input
                id="daily-target"
                type="number"
                min={1}
                max={200}
                value={typeof dailyTarget === 'number' ? dailyTarget : ''}
                onChange={(e) => setDailyTarget(e.target.value ? Number(e.target.value) : '')}
                placeholder="10"
                className="w-full rounded-md border border-glass-border bg-surface-dark px-3 py-2 text-sm text-gray-100 focus:border-accent-blue focus:outline-none"
              />
              <p className="mt-1 text-xs text-gray-500">Total points to earn each day by completing habits.</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={creating || !name.trim()}
                className="flex-1 rounded-lg bg-accent-blue px-4 py-2 text-sm font-medium text-white hover:bg-accent-blue/80 disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create Profile'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="rounded-lg border border-glass-border px-4 py-2 text-sm font-medium text-gray-300 hover:bg-glass/30"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-block rounded-lg bg-accent-blue px-6 py-3 text-sm font-medium text-white hover:bg-accent-blue/80 transition-colors"
          >
            Create a Profile
          </button>
        )}
      </div>
    </div>
  );
}