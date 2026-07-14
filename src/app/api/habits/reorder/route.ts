// ============================================================================
// POST /api/habits/reorder — Reorder habits for a profile (atomic transaction)
// Takes { profileId, orderedHabitIds }, validates every ID belongs to profileId
// before touching anything. Module namespace: habits module owns this endpoint.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { reorderHabits } from '@modules/habits/actions';
import { toAppError } from '@core/errors';

/** POST — Reorder habits */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const updatedHabits = await reorderHabits(body);
    return NextResponse.json(updatedHabits);
  } catch (error) {
    const appError = toAppError(error);
    return NextResponse.json(appError, { status: appError.status });
  }
}