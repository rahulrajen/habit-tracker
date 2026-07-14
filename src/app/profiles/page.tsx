'use client';

// ============================================================================
// /profiles — Empty-State Landing Page (Phase 5 Go-Live Fix)
// Prevents 404 when unseeded production users click "Create Profile" from root.
// Shows profile list if profiles exist; otherwise shows creation form.
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

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Unknown error' }));
    const err: any = new Error(body.error || 'Request failed');
    err.status = res.status;
    throw err;
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
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('\u{1F464}');
  const [newTarget, setNewTarget] = useState<number | ''>(10);
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

  // If profiles exist, redirect to first profile
  useEffect(() => {
    if (profiles.length > 0 && !loading) {
      router.replace(`/profiles/${profiles[0].id}`);
    }
  }, [profiles, loading, router]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const newProfile = await createProfile({
        name: newName.trim(),
        emoji: newEmoji,
        target_points: typeof newTarget === 'number' ? newTarget : 10,
      });
      // Store active profile in localStorage and redirect
      try { localStorage.setItem('habit-tracker-active-profile-id', newProfile.id.toString()); } catch { /* noop */ }
      router.replace(`/profiles/${newProfile.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create profile');
      setCreating(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><p className="text-gray-400">Loading...</p></div>;
  }

  // If profiles exist, redirect is already triggered above — show nothing
  if (profiles.length > 0) {
    return null;
  }

  // Empty state: show creation form
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-dark">
      <div className="glass-card p-8 text-center max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-100 mb-2">Welcome to Habit Tracker</h1>
        <p className="text-gray-400 mb-6">Create your first profile to get started.</p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">{error}</div>
        )}

        {showCreateForm ? (
          <form onSubmit={handleCreate} className="space-y-3 text-left">
            <input
              type="text"
              maxLength={4}
              value={newEmoji}
              onChange={(e) => setNewEmoji(e.target.value)}
              placeholder="Emoji"
              className="w-full rounded-md border border-glass-border bg-surface-dark px-3 py-2 text-sm text-gray-100 focus:border-accent-blue focus:outline-none"
            />
            <input
              type="text"
              maxLength={64}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Profile name"
              className="w-full rounded-md border border-glass-border bg-surface-dark px-3 py-2 text-sm text-gray-100 focus:border-accent-blue focus:outline-none"
            />
            <input
              type="number"
              min={1}
              value={typeof newTarget === 'number' ? newTarget : ''}
              onChange={(e) => setNewTarget(e.target.value ? Number(e.target.value) : '')}
              placeholder="Daily target (points)"
              className="w-full rounded-md border border-glass-border bg-surface-dark px-3 py-2 text-sm text-gray-100 focus:border-accent-blue focus:outline-none"
            />
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={creating || !newName.trim()}
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