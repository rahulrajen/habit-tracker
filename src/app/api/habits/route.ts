// ============================================================================
// GET /api/habits?profileId=X — List all non-archived habits for a profile
// POST /api/habits — Create a new habit
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getHabitsByProfile, createHabit } from '@modules/habits/actions';
import { toAppError } from '@core/errors';

/** GET — List habits for a profile */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const profileIdStr = url.searchParams.get('profileId');

    if (!profileIdStr) {
      return NextResponse.json(
        { error: 'Missing required query parameter: profileId' },
        { status: 400 }
      );
    }

    const profileId = parseInt(profileIdStr, 10);

    if (isNaN(profileId)) {
      return NextResponse.json(
        { error: 'profileId must be a valid integer' },
        { status: 400 }
      );
    }

    const habits = await getHabitsByProfile(profileId);
    return NextResponse.json(habits);
  } catch (error) {
    const appError = toAppError(error);
    return NextResponse.json(appError, { status: appError.status });
  }
}

/** POST — Create a new habit */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const newHabit = await createHabit(body);
    return NextResponse.json(newHabit, { status: 201 });
  } catch (error) {
    const appError = toAppError(error);
    return NextResponse.json(appError, { status: appError.status });
  }
}