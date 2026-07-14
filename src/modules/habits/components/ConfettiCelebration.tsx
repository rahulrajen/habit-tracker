'use client';

// ============================================================================
// ConfettiCelebration — Fires confetti when daily target is first reached
// Phase 3 scope: localStorage-guarded per profile per day (IST date)
// ============================================================================

import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

interface ConfettiCelebrationProps {
  isTargetMet: boolean;
  profileId: string;
}

/**
 * Generate a unique localStorage key for confetti guard:
 * Includes IST date so it auto-resets at midnight.
 */
function getConfettiKey(profileId: string): string {
  // Use client-side IST date to ensure same-day detection works correctly
  const now = new Date();
  // Convert UTC to IST (UTC+5:30)
  const istMs = now.getTime() + 5.5 * 60 * 60 * 1000;
  const istDate = new Date(istMs);
  const dateStr = `${istDate.getFullYear()}-${String(istDate.getMonth() + 1).padStart(2, '0')}-${String(istDate.getDate()).padStart(2, '0')}`;
  return `habit-tracker-confetti-${profileId}-${dateStr}`;
}

export default function ConfettiCelebration({
  isTargetMet,
  profileId,
}: ConfettiCelebrationProps) {
  const hasFiredRef = useRef(false);

  useEffect(() => {
    if (!isTargetMet || hasFiredRef.current) return;

    // Check localStorage guard
    const key = getConfettiKey(profileId);
    const alreadyFired = localStorage.getItem(key);

    if (alreadyFired) return; // Already fired today for this profile

    // Fire confetti!
    const end = Date.now() + 1500; // Confetti duration in ms
    const colors = ['#6366f1', '#a855f7', '#22c55e', '#f59e0b', '#ec4899'];

    const frame = () => {
      if (Date.now() > end) {
        // Mark as fired in localStorage
        localStorage.setItem(key, 'true');
        hasFiredRef.current = true;
        return;
      }

      confetti({
        particleCount: 2,
        angle: 60 + Math.random() * 60,
        spread: 100 + Math.random() * 50,
        origin: { x: 0.5, y: 0.7 },
        colors,
        drift: (Math.random() - 0.5) * 0.5,
      });

      requestAnimationFrame(frame);
    };

    frame();
  }, [isTargetMet, profileId]);

  // Clear localStorage guard when user drops below target after having met it.
  // This allows confetti to re-fire the next time they reach target again.
  useEffect(() => {
    if (isTargetMet) return; // Still at/above target — do nothing

    const key = getConfettiKey(profileId);
    localStorage.removeItem(key);
    hasFiredRef.current = false;
  }, [isTargetMet, profileId]);

  return null; // This component doesn't render anything visible
}