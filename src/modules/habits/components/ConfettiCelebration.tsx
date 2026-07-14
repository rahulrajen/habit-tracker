'use client';

// ============================================================================
// ConfettiCelebration — Fires confetti when isTargetMet becomes true
// Guarded by mountedRef to prevent firing on mount (page navigation)
// ============================================================================

import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

interface ConfettiCelebrationProps {
  isTargetMet: boolean;
  profileId: string;
}

export default function ConfettiCelebration({
  isTargetMet,
  profileId,
}: ConfettiCelebrationProps) {
  const hasFiredRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    // Mark first mount — prevent firing on initial render (page navigation guard)
    if (mountedRef.current) {
      mountedRef.current = false;
      hasFiredRef.current = true; // Skip this state as "already fired"
      return;
    }

    // Fire only when transitioning from not-met → met AND haven't fired yet for this transition
    if (isTargetMet && !hasFiredRef.current) {
      const end = Date.now() + 1500;
      const colors = ['#6366f1', '#a855f7', '#22c55e', '#f59e0b', '#ec4899'];

      const frame = () => {
        if (Date.now() > end) return;
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
      hasFiredRef.current = true;
    }

    // Reset when target not met — allows next transition to fire
    if (!isTargetMet) {
      hasFiredRef.current = false;
    }
  }, [isTargetMet, profileId]);

  return null;
}