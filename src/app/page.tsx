import { redirect } from 'next/navigation';
import { getAllProfiles } from '@modules/profiles/actions';

/**
 * Root page — redirects to /profiles/[id] based on:
 * 1. localStorage fallback (habit-tracker-active-profile-id)
 * 2. First available non-archived profile
 * 3. Otherwise shows a minimal "no profiles" state
 */
export default async function RootPage() {
  // Try to get the last-used profile from localStorage
  // Note: In a server component, we can't read localStorage directly.
  // The client-side redirect handles this in /profiles/[id]/page.tsx.
  // As a server fallback, check if there's a valid profile ID in search params
  // or just redirect to the first available profile.

  const profiles = await getAllProfiles();

  if (profiles.length === 0) {
    // No profiles exist — render a minimal "create one" prompt
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-dark">
        <div className="glass-card p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-100 mb-4">Welcome to Habit Tracker</h1>
          <p className="text-gray-400 mb-6">No profiles exist yet. Navigate to create your first profile.</p>
          <a
            href="/profiles"
            className="inline-block rounded-lg bg-accent-blue px-6 py-3 text-sm font-medium text-white hover:bg-accent-blue/80 transition-colors"
          >
            Create a Profile
          </a>
        </div>
      </div>
    );
  }

  // Redirect to the first (or most recently created) profile
  // profiles are sorted by created_at DESC, so first one is newest
  redirect(`/profiles/${profiles[0].id}`);
}