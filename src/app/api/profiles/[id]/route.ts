'use server';

// ============================================================================
// /api/profiles/[id] — Get, update target, or archive a single profile
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getProfileById, updateTarget, archiveProfile } from '@modules/profiles/actions';
import { toAppError } from '@core/errors';

// ---------------------------------------------------------------------------
// GET — retrieve a single profile by ID
// ---------------------------------------------------------------------------

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const profileId = parseInt(id, 10);

    if (isNaN(profileId)) {
      return NextResponse.json(
        { error: 'Invalid profile ID' },
        { status: 400 }
      );
    }

    const profile = await getProfileById(profileId);
    return NextResponse.json(profile);
  } catch (error) {
    const appError = toAppError(error);
    return NextResponse.json(
      { error: appError.message },
      { status: appError.status }
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH — update a profile's target points
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const profileId = parseInt(id, 10);

    if (isNaN(profileId)) {
      return NextResponse.json(
        { error: 'Invalid profile ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const profile = await updateTarget(profileId, body);
    return NextResponse.json(profile);
  } catch (error) {
    const appError = toAppError(error);
    return NextResponse.json(
      { error: appError.message },
      { status: appError.status }
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE — archive a profile (soft-delete)
// ---------------------------------------------------------------------------

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const profileId = parseInt(id, 10);

    if (isNaN(profileId)) {
      return NextResponse.json(
        { error: 'Invalid profile ID' },
        { status: 400 }
      );
    }

    const profile = await archiveProfile(profileId);
    return NextResponse.json(profile);
  } catch (error) {
    const appError = toAppError(error);
    return NextResponse.json(
      { error: appError.message },
      { status: appError.status }
    );
  }
}