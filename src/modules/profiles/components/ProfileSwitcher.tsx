// ============================================================================
// ProfileSwitcher — Client component for profile management UI
// Extracted from /profiles/[id]/page.tsx to respect 150-line boundary (Pillar 1)
// Handles: profile list, create form, archive button, inline target editing
// ============================================================================

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const STORAGE_KEY = 'habit-tracker-active-profile-id';

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
  const [newEmoji, setNewEmoji] = useState('\u{1F464}');
  const [newTarget, setNewTarget] = useState<number | ''>(10);

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

  const createMutation = useMutation({ mutationFn: createProfile, onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['profiles'] }); invalidateHabitsQueries(); setShowCreateForm(false); setNewName(''); setNewEmoji('\u{1F464}'); setNewTarget(10); } });
  const archiveMutation = useMutation({ mutationFn: archiveProfile, onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['profiles'] }); invalidateHabitsQueries(); if (activeProfileId) { const remaining = profiles.filter((p) => p.id.toString() !== activeProfileId); if (remaining.length > 0) router.replace(`/profiles/${remaining[0].id}`); } } });
  const targetMutation = useMutation({ mutationFn: ({ id, target_points }: { id: number; target_points: number }) => updateTarget(id, target_points), onMutate: async ({ id, target_points }) => { await queryClient.cancelQueries({ queryKey: ['profiles'] }); const previous = queryClient.getQueryData<Profile[]>(['profiles']); if (previous) queryClient.setQueryData(['profiles'], previous.map((p) => (p.id === id ? { ...p, target_points } : p))); return { previous }; }, onError: (_err, _vars, context) => { if (context?.previous) queryClient.setQueryData(['profiles'], context.previous); }, onSettled: () => { void queryClient.invalidateQueries({ queryKey: ['profiles'] }); setEditingTargetId(null); } });

  const activeProfile = profiles.find((p) => p.id.toString() === activeProfileId);
  const nonArchivedCount = profiles.length;

  // Invalidate habits queries on profile switch
  useEffect(() => { invalidateHabitsQueries(); }, [activeProfileId]);

  const handleCreate = (e: React.FormEvent) => { e.preventDefault(); if (!newName.trim()) return; if (nonArchivedCount >= 8) return; createMutation.mutate({ name: newName.trim(), emoji: newEmoji, target_points: typeof newTarget === 'number' ? newTarget : 10 }); };
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
            <input type="text" maxLength={4} value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)} placeholder="Emoji" className="w-full rounded-md border border-glass-border bg-surface-dark px-3 py-2 text-sm text-gray-100 focus:border-accent-blue focus:outline-none" />
            <input type="text" maxLength={64} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Profile name" className="w-full rounded-md border border-glass-border bg-surface-dark px-3 py-2 text-sm text-gray-100 focus:border-accent-blue focus:outline-none" />
            <input type="number" min={1} value={typeof newTarget === 'number' ? newTarget : ''} onChange={(e) => setNewTarget(e.target.value ? Number(e.target.value) : '')} placeholder="Daily target (points)" className="w-full rounded-md border border-glass-border bg-surface-dark px-3 py-2 text-sm text-gray-100 focus:border-accent-blue focus:outline-none" />
            <div className="flex gap-3">
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