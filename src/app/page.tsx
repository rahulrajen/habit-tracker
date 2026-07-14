import { redirect } from 'next/navigation';
import { getAllProfiles } from '@modules/profiles/actions';
import ProfilesPage from '@/app/profiles/page';

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
    // No profiles exist — delegate to the dedicated empty-state page
    // which handles creation form + redirect after creation
    return <ProfilesPage />;
  }

  // Redirect to the first (or most recently created) profile
  // profiles are sorted by created_at DESC, so first one is newest
  redirect(`/profiles/${profiles[0].id}`);
}