'use client';

// ============================================================================
// HabitSettings — Per-profile habit management (add, remove, rearrange via drag)
// Used on /profiles/[id]/settings page
// ============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HabitItem {
  id: number;
  profile_id: number;
  text: string;
  emoji: string;
  points: number;
  display_order: number;
}

// ---------------------------------------------------------------------------
// Emoji picker data (shared with HabitBoard)
// ---------------------------------------------------------------------------

const HABIT_EMOJIS = [
  '\u{1F4AA}', '\u{1F3C3}', '\u{1F4DA}', '\u{1F3B5}', '\u{1F3A8}',
  '\u{1F4DD}', '\u{1F331}', '\u{1F6B4}', '\u{1F3CA}', '\u{1F93D}',
  '\u{1F9D8}', '\u{2615}', '\u{1F4A7}', '\u{1F34E}', '\u{1F4A4}',
  '\u{1F514}', '\u{1F4AC}', '\u{2764}', '\u{2B50}', '\u{1F3AF}',
];

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function fetchHabits(profileId: string): Promise<HabitItem[]> {
  const res = await fetch(`/api/habits?profileId=${profileId}`);
  if (!res.ok) throw new Error('Failed to fetch habits');
  return res.json();
}

async function createHabit(data: {
  profile_id: number;
  text: string;
  emoji: string;
  points: number;
}): Promise<HabitItem> {
  const res = await fetch('/api/habits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(body.error || 'Create failed');
  }
  return res.json();
}

async function updateHabit(habitId: number, data: {
  text?: string;
  emoji?: string;
  points?: number;
}): Promise<HabitItem> {
  const res = await fetch(`/api/habits/${habitId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(body.error || 'Update failed');
  }
  return res.json();
}

async function archiveHabit(habitId: number): Promise<void> {
  const res = await fetch(`/api/habits/${habitId}`, { method: 'DELETE' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(body.error || 'Archive failed');
  }
}

async function reorderHabits(
  profileId: string,
  orderedHabitIds: number[]
): Promise<void> {
  const res = await fetch('/api/habits/reorder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      profile_id: parseInt(profileId, 10),
      orderedHabitIds,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(body.error || 'Reorder failed');
  }
}

// ---------------------------------------------------------------------------
// Drag-and-drop sensor configuration (same as HabitBoard)
// ---------------------------------------------------------------------------

function useAppSensors() {
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: { delay: 250, tolerance: 5 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 250, tolerance: 5 },
  });
  const keyboardSensor = useSensor(KeyboardSensor, {});
  return useSensors(mouseSensor, touchSensor, keyboardSensor);
}

// ---------------------------------------------------------------------------
// EmojiPicker — reusable emoji selection grid
// ---------------------------------------------------------------------------

function EmojiPicker({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (emoji: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-medium text-gray-400">Icon</label>
      <div className="flex flex-wrap gap-1.5">
        {HABIT_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onSelect(emoji)}
            className={`w-9 h-9 rounded-lg text-base flex items-center justify-center transition-all ${
              selected === emoji
                ? 'bg-indigo-500/20 ring-2 ring-indigo-400 scale-110'
                : 'bg-white/5 border border-white/10 hover:border-white/20'
            }`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PointsSlider — reusable points slider (5-30, step 5)
// ---------------------------------------------------------------------------

function PointsSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-medium text-gray-400">Points per completion</label>
        <span className="text-sm font-bold text-indigo-400">{value}</span>
      </div>
      <input
        type="range"
        min={5}
        max={30}
        step={5}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-full accent-indigo-500"
      />
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>5</span>
        <span>10</span>
        <span>15</span>
        <span>20</span>
        <span>25</span>
        <span>30</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EditForm — inline edit form shown below a habit row
// ---------------------------------------------------------------------------

function EditForm({
  habit,
  onSave,
  onCancel,
  isUpdating,
}: {
  habit: HabitItem;
  onSave: (data: { text: string; emoji: string; points: number }) => void;
  onCancel: () => void;
  isUpdating: boolean;
}) {
  const [text, setText] = useState(habit.text);
  const [emoji, setEmoji] = useState(habit.emoji);
  const [points, setPoints] = useState(habit.points);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSave({ text: text.trim(), emoji, points });
  };

  return (
    <div className="glass-card p-4 sm:p-5 space-y-3 animate-slideDown ml-8 mr-2">
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Emoji picker */}
        <EmojiPicker selected={emoji} onSelect={setEmoji} />

        {/* Habit name */}
        <input
          type="text"
          maxLength={128}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Morning workout..."
          className="glass-input w-full"
          autoFocus
        />

        {/* Points slider */}
        <PointsSlider value={points} onChange={setPoints} />

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isUpdating || !text.trim()}
            className="flex-1 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-400 hover:to-purple-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUpdating ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-white/10 transition-all"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SortableHabitRow — uses useSortable for dnd-kit drag support
// ---------------------------------------------------------------------------

function SortableHabitRow({
  habit,
  index,
  onArchive,
  onEdit,
  isArchiving,
}: {
  habit: HabitItem;
  index: number;
  onArchive: (habitId: number) => void;
  onEdit: (habit: HabitItem) => void;
  isArchiving: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: habit.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="flex h-6 w-6 flex-shrink-0 cursor-grab items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 active:cursor-grabbing"
          title="Drag to reorder"
        >
          <span className="text-sm">&#9776;</span>
        </button>

        {/* Emoji */}
        <span className="text-lg flex-shrink-0">{habit.emoji}</span>

        {/* Text + Points */}
        <div className="flex-1 min-w-0">
          <span className="block text-sm text-gray-100 truncate">{habit.text}</span>
          <span className="text-xs text-indigo-400">{habit.points} pts</span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Edit button */}
          <button
            onClick={() => onEdit(habit)}
            disabled={isArchiving}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-400 hover:bg-indigo-500/20 hover:text-indigo-300 hover:border-indigo-500/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            title="Edit habit"
          >
            ✎
          </button>

          {/* Delete button (instant archive, no confirmation) */}
          <button
            onClick={() => onArchive(habit.id)}
            disabled={isArchiving}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-400 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            title="Archive habit"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// HabitSettings component
// ---------------------------------------------------------------------------

interface HabitSettingsProps {
  profileId: string;
}

export default function HabitSettings({ profileId }: HabitSettingsProps) {
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newHabitText, setNewHabitText] = useState('');
  const [newHabitEmoji, setNewHabitEmoji] = useState('\u{1F4AA}');
  const [newHabitPoints, setNewHabitPoints] = useState<number>(15); // default: middle of slider range

  // Edit state
  const [editingHabit, setEditingHabit] = useState<HabitItem | null>(null);

  const sensors = useAppSensors();

  const { data: habits = [], isLoading } = useQuery({
    queryKey: ['habits', profileId],
    queryFn: () => fetchHabits(profileId),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createHabit,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['habits', profileId] });
      setShowCreateForm(false);
      setNewHabitText('');
      setNewHabitEmoji('\u{1F4AA}');
      setNewHabitPoints(15); // reset to middle of slider range
    },
  });

  // Update mutation (edit)
  const updateMutation = useMutation({
    mutationFn: ({ habitId, data }: { habitId: number; data: { text?: string; emoji?: string; points?: number } }) =>
      updateHabit(habitId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['habits', profileId] });
      setEditingHabit(null);
    },
  });

  // Archive mutation (instant, no confirmation)
  const archiveMutation = useMutation({
    mutationFn: archiveHabit,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['habits', profileId] });
      // Close edit form if archived habit was being edited
      setEditingHabit(null);
    },
  });

  // Reorder mutation
  const reorderMutation = useMutation({
    mutationFn: (orderedIds: number[]) => reorderHabits(profileId, orderedIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['habits', profileId] });
    },
  });

  const handleCreateHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitText.trim()) return;
    createMutation.mutate({
      profile_id: parseInt(profileId, 10),
      text: newHabitText.trim(),
      emoji: newHabitEmoji,
      points: newHabitPoints,
    });
  };

  const handleArchive = (habitId: number) => {
    archiveMutation.mutate(habitId); // Instant archive, no confirmation
  };

  const handleEdit = (habit: HabitItem) => {
    setEditingHabit(habit);
  };

  const handleSaveEdit = (data: { text: string; emoji: string; points: number }) => {
    if (!editingHabit) return;
    updateMutation.mutate({ habitId: editingHabit.id, data });
  };

  const handleCancelEdit = () => {
    setEditingHabit(null);
  };

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (!active || !over || String(active.id) === String(over.id)) return;

      const currentIndex = habits.findIndex((h) => h.id === active.id);
      const newIndex = habits.findIndex((h) => h.id === over.id);

      if (currentIndex === -1 || newIndex === -1) return;

      // Compute new order
      const updated = [...habits];
      const [removed] = updated.splice(currentIndex, 1);
      updated.splice(newIndex, 0, removed);

      // Optimistic update
      queryClient.setQueryData<HabitItem[]>(['habits', profileId], updated);

      // Send to server
      const orderedIds = updated.map((h) => h.id);
      reorderMutation.mutate(orderedIds);
    },
    [habits, profileId, queryClient, reorderMutation]
  );

  return (
    <div className="space-y-4">
      {/* Habits list with drag-and-drop */}
      <div>
        {isLoading ? (
          <div className="space-y-2">
            <div className="skeleton h-16 rounded-xl" />
            <div className="skeleton h-16 rounded-xl" />
          </div>
        ) : habits.length === 0 ? (
          <p className="text-center text-sm text-gray-500">No habits yet. Add one below.</p>
        ) : (
          <>
            {/* Show edit form above the list if a habit is being edited */}
            {editingHabit && (
              <EditForm
                key={`edit-${editingHabit.id}`}
                habit={editingHabit}
                onSave={handleSaveEdit}
                onCancel={handleCancelEdit}
                isUpdating={updateMutation.isPending}
              />
            )}

            <DndContext
              collisionDetection={closestCenter}
              sensors={sensors}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={habits.map((h) => h.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {habits.map((habit, index) => (
                    <SortableHabitRow
                      key={habit.id}
                      habit={habit}
                      index={index}
                      onArchive={handleArchive}
                      onEdit={handleEdit}
                      isArchiving={archiveMutation.isPending}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </>
        )}
      </div>

      {/* Create form toggle */}
      {!showCreateForm && (
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 py-3 text-sm text-gray-400 hover:border-indigo-400/40 hover:text-indigo-300 transition-all"
        >
          <span>➕</span> Add Habit ({habits.length}/60 used)
        </button>
      )}

      {/* Create habit form */}
      {showCreateForm && (
        <div className="glass-card p-4 sm:p-5 space-y-3 sm:space-y-4 animate-slideDown">
          <form onSubmit={handleCreateHabit} className="space-y-3 sm:space-y-4">
            {/* Emoji picker */}
            <EmojiPicker selected={newHabitEmoji} onSelect={setNewHabitEmoji} />

            {/* Habit name */}
            <input
              type="text"
              maxLength={128}
              value={newHabitText}
              onChange={(e) => setNewHabitText(e.target.value)}
              placeholder="e.g. Morning workout..."
              className="glass-input w-full"
              autoFocus
            />

            {/* Points slider */}
            <PointsSlider value={newHabitPoints} onChange={setNewHabitPoints} />

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createMutation.isPending || !newHabitText.trim()}
                className="flex-1 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-400 hover:to-purple-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Habit'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}