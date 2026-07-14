// ============================================================================
// GET /api/habits/[id] — Get a single habit by ID
// PATCH /api/habits/[id] — Update a habit (text, emoji, points)
// DELETE /api/habits/[id] — Archive a habit (soft-delete)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getHabitById, updateHabit, archiveHabit } from '@modules/habits/actions';
import { toAppError } from '@core/errors';

/** GET — Get a single habit by ID */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const habitId = parseInt((await params).id, 10);

    if (isNaN(habitId)) {
      return NextResponse.json({ error: 'Invalid habit ID' }, { status: 400 });
    }

    const habit = await getHabitById(habitId);
    return NextResponse.json(habit);
  } catch (error) {
    const appError = toAppError(error);
    return NextResponse.json(appError, { status: appError.status });
  }
}

/** PATCH — Update a habit */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const habitId = parseInt((await params).id, 10);

    if (isNaN(habitId)) {
      return NextResponse.json({ error: 'Invalid habit ID' }, { status: 400 });
    }

    const body = await request.json();
    const updated = await updateHabit(habitId, body);
    return NextResponse.json(updated);
  } catch (error) {
    const appError = toAppError(error);
    return NextResponse.json(appError, { status: appError.status });
  }
}

/** DELETE — Archive a habit (soft-delete) */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const habitId = parseInt((await params).id, 10);

    if (isNaN(habitId)) {
      return NextResponse.json({ error: 'Invalid habit ID' }, { status: 400 });
    }

    const archived = await archiveHabit(habitId);
    return NextResponse.json(archived);
  } catch (error) {
    const appError = toAppError(error);
    return NextResponse.json(appError, { status: appError.status });
  }
}