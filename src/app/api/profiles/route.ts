'use server';

// ============================================================================
// /api/profiles — List all non-archived profiles (GET) or create a new one (POST)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAllProfiles, createProfile } from '@modules/profiles/actions';
import { toAppError } from '@core/errors';

// ---------------------------------------------------------------------------
// GET — list all non-archived profiles
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const profiles = await getAllProfiles();
    return NextResponse.json(profiles);
  } catch (error) {
    const appError = toAppError(error);
    return NextResponse.json(
      { error: appError.message },
      { status: appError.status },
    );
  }
}

// ---------------------------------------------------------------------------
// POST — create a new profile (with soft-ceiling enforcement)
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const profile = await createProfile(body);
    return NextResponse.json(profile, { status: 201 });
  } catch (error) {
    const appError = toAppError(error);
    return NextResponse.json(
      { error: appError.message },
      { status: appError.status },
    );
  }
}