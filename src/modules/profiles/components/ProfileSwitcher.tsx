// ============================================================================
// ProfileSwitcher — Client component for profile management UI
// Extracted from /profiles/[id]/page.tsx to respect 150-line boundary (Pillar 1)
// Handles: profile list, create form, archive button, inline target editing
// ============================================================================

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const STORAGE_KEY = 'habit-tracker-active-profile-id';

// Common emojis for profile selection (no external deps needed)
const PROFILE_EMOJIS = [
  '\u{1F464}', // baby
  '\u{1F466}', // boy
  '\u{1F467}', // girl
  '\u{1F468}', // man
  '\u{1F469}', // woman
  '\u{1F474}', // prince
  '\u{1F475}', // princess
  '\u{1F9D1}', // adult
  '\u{1F9D2}', // man (adult)
  '\u{1F9D3}', // woman (adult)
  '\u{1F476}', // unicorn
  '\u{1F436}', // cat face
  '\u{1F431}', // mouse face
  '\u{1F437}', // hamster
  '\u{1F438}', // rabbit face
  '\u{1F981}', // crab
  '\u{1F426}', // bird
  '\u{1F435}', // fox face
  '\u{1F4B0}', // money bag
  '\u{2B50}', // sparkle
];

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
    const err = new Error(body.error || 'Request failed') as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return res.json() as Promise<T>;
}

async function fetchProfiles(): Promise<Profile[]> { return apiFetch<Profile[]>('/api/profiles'); }
async function createProfile(data: { name: string; emoji: string; target_points: number }): Promise<Profile> {
  return apiFetch<Profile>('/api/profiles', { method: 'POST', body: JSON.stringify(data) });
}
async function archiveProfile(id: number): Promise<void> { await apiFetch(`/api/profiles/${id}`, { method: 'DELETE' }); }
async function updateTarget(id: number, target_points: number): Promise<Profile> {
  return apiFetch<Profile>(`/api/profiles/${id}`, { method: 'PATCH', body: JSON.stringify({ target_points }) });
}

export default function ProfileSwitcher() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTargetId, setEditingTargetId] = useState<number | null>(null);
  const [editTargetValue, setEditTargetValue] = useState('');
  const [newName, setNewName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('\u{1F464}'); // default: baby emoji
  const [dailyTarget, setDailyTarget] = useState<number | ''>(10);

  // Resolve active profile ID from URL params (source of truth)
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);

  useEffect(() => {
    const hashId = window.location.pathname.split('/profiles/')[1];
    if (hashId) {
      setActiveProfileId(hashId);
      try { localStorage.setItem(STORAGE_KEY, hashId); } catch { /* noop */ }
    }
  }, []);

  const { data: profiles = [], isLoading, error } = useQuery({ queryKey: ['profiles'], queryFn: fetchProfiles });

  // Invalidate habits queries when profile changes (ensures clean data on switch)
  const invalidateHabitsQueries = () => { void queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'habits' || query.queryKey[0] === 'progress' || query.queryKey[0] === 'history' }); };

  const createMutation = useMutation({ mutationFn: createProfile, onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['profiles'] }); invalidateHabitsQueries(); setShowCreateForm(false); setNewName(''); setSelectedEmoji('\u{1F464}'); setDailyTarget(10); } });
  const archiveMutation = useMutation({ mutationFn: archiveProfile, onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['profiles'] }); invalidateHabitsQueries(); if (activeProfileId) { const remaining = profiles.filter((p) => p.id.toString() !== activeProfileId); if (remaining.length > 0) router.replace(`/profiles/${remaining[0].id}`); } } });
  const targetMutation = useMutation({ mutationFn: ({ id, target_points }: { id: number; target_points: number }) => updateTarget(id, target_points), onMutate: async ({ id, target_points }) => { await queryClient.cancelQueries({ queryKey: ['profiles'] }); const previous = queryClient.getQueryData<Profile[]>(['profiles']); if (previous) queryClient.setQueryData(['profiles'], previous.map((p) => (p.id === id ? { ...p, target_points } : p))); return { previous }; }, onError: (_err, _vars, context) => { if (context?.previous) queryClient.setQueryData(['profiles'], context.previous); }, onSettled: () => { void queryClient.invalidateQueries({ queryKey: ['profiles'] }); setEditingTargetId(null); } });

  // activeProfile is used implicitly via activeProfileId in the template below
  void profiles.find((p) => p.id.toString() === activeProfileId);
  const nonArchivedCount = profiles.length;

  // Invalidate habits queries on profile switch
  useEffect(() => { invalidateHabitsQueries(); }, [activeProfileId]);

  const handleCreate = (e: React.FormEvent) => { e.preventDefault(); if (!newName.trim()) return; if (nonArchivedCount >= 8) return; createMutation.mutate({ name: newName.trim(), emoji: selectedEmoji, target_points: typeof dailyTarget === 'number' ? dailyTarget : 10 }); };
  const handleArchive = (id: number) => { if (profiles.length <= 1 || activeProfileId === id.toString()) return; archiveMutation.mutate(id); };
  const handleTargetSubmit = (id: number, e: React.FormEvent) => { e.preventDefault(); const val = parseInt(editTargetValue, 10); if (!isNaN(val) && val >= 1) targetMutation.mutate({ id, target_points: val }); };

  if (isLoading) return <div className="text-gray-400">Loading...</div>;
  if (error) return null; // Parent handles error state

  return (
    <div className="space-y-3">
      {profiles.map((profile) => (
        <div key={profile.id} className={`glass-card p-3 transition-all ${profile.id.toString() === activeProfileId ? 'border-accent-blue/50 ring-1 ring-accent-blue/30' : ''}`}>
          <div className="flex items-center justify-between">
            <button onClick={() => router.replace(`/profiles/${profile.id}`)} disabled={profile.id.toString() === activeProfileId} className="flex flex-1 items-center gap-3 text-left">
              <span className="text-xl">{profile.emoji}</span>
              <div><p className="font-medium text-gray-100">{profile.name}</p>{profile.id.toString() === activeProfileId && <span className="text-xs text-accent-blue">Active</span>}</div>
            </button>
            <div className="flex items-center gap-2">
              {editingTargetId === profile.id ? (
                <form onSubmit={(e) => handleTargetSubmit(profile.id, e)} className="flex items-center gap-1">
                  <input type="number" min={1} value={editTargetValue} onChange={(e) => setEditTargetValue(e.target.value)} className="w-20 rounded-md border border-glass-border bg-surface-dark px-2 py-1 text-sm text-gray-100 focus:border-accent-blue focus:outline-none" autoFocus />
                  <button type="submit" disabled={targetMutation.isPending} className="rounded p-1 text-green-400 hover:bg-glass/30">OK</button>
                  <button type="button" onClick={() => setEditingTargetId(null)} className="rounded p-1 text-gray-400 hover:bg-glass/30">Cancel</button>
                </form>
              ) : (
                <button onClick={() => { setEditingTargetId(profile.id); setEditTargetValue(profile.target_points.toString()); }} disabled={profile.id.toString() === activeProfileId} className="rounded p-1 text-gray-400 hover:bg-glass/30 disabled:opacity-30" title="Edit target">✎</button>
              )}
              {profiles.length > 1 && profile.id.toString() !== activeProfileId && (
                <button onClick={() => handleArchive(profile.id)} disabled={archiveMutation.isPending} className="rounded p-1 text-gray-500 hover:bg-glass/30 disabled:opacity-50">Archive</button>
              )}
            </div>
          </div>
        </div>
      ))}

      {nonArchivedCount < 8 && !showCreateForm && (
        <button onClick={() => setShowCreateForm(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-glass-border py-3 text-sm text-gray-400 hover:border-accent-blue/50 hover:text-accent-blue transition-colors">+ Add Profile ({nonArchivedCount}/8 used)</button>
      )}

      {showCreateForm && (
        <div className="glass-card p-4">
          <h2 className="mb-3 text-sm font-medium text-gray-100">New Profile</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            {/* Emoji Selection */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-300">Choose an Icon</label>
              <div className="flex flex-wrap gap-1.5 justify-center mb-2">
                {PROFILE_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setSelectedEmoji(emoji)}
                    className={`w-9 h-9 rounded-lg text-base flex items-center justify-center transition-all ${
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

            {/* Profile Name */}
            <div>
              <label htmlFor="profile-name-inline" className="mb-1 block text-xs font-medium text-gray-300">Profile Name</label>
              <input
                id="profile-name-inline"
                type="text"
                maxLength={64}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Parent 1, Kid A, etc."
                className="w-full rounded-md border border-glass-border bg-surface-dark px-3 py-2 text-sm text-gray-100 focus:border-accent-blue focus:outline-none"
                autoFocus
              />
            </div>

            {/* Daily Target */}
            <div>
              <label htmlFor="daily-target-inline" className="mb-1 block text-xs font-medium text-gray-300">Daily Target (points)</label>
              <input
                id="daily-target-inline"
                type="number"
                min={1}
                max={200}
                value={typeof dailyTarget === 'number' ? dailyTarget : ''}
                onChange={(e) => setDailyTarget(e.target.value ? Number(e.target.value) : '')}
                placeholder="10"
                className="w-full rounded-md border border-glass-border bg-surface-dark px-3 py-2 text-sm text-gray-100 focus:border-accent-blue focus:outline-none"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={createMutation.isPending || !newName.trim()} className="flex-1 rounded-lg bg-accent-blue px-4 py-2 text-sm font-medium text-white hover:bg-accent-blue/80 disabled:opacity-50">{createMutation.isPending ? 'Creating...' : 'Create Profile'}</button>
              <button type="button" onClick={() => setShowCreateForm(false)} className="rounded-lg border border-glass-border px-4 py-2 text-sm font-medium text-gray-300 hover:bg-glass/30">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {nonArchivedCount >= 8 && <p className="text-center text-xs text-gray-500">Maximum profiles reached ({nonArchivedCount}/8).</p>}
    </div>
  );
}