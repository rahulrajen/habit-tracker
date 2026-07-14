// ============================================================================
// POST /api/habits/[id]/completion — Toggle completion for a habit on today's IST date
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { toggleCompletion } from '@modules/habits/actions';
import { toAppError } from '@core/errors';

/** POST — Toggle completion */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const habitId = parseInt((await params).id, 10);

    if (isNaN(habitId)) {
      return NextResponse.json({ error: 'Invalid habit ID' }, { status: 400 });
    }

    const completed = await toggleCompletion({ habit_id: habitId });
    return NextResponse.json(completed);
  } catch (error) {
    const appError = toAppError(error);
    return NextResponse.json(appError, { status: appError.status });
  }
}