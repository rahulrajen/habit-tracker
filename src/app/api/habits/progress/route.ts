// ============================================================================
// GET /api/habits/progress?profileId=N
// Returns daily progress data for the progress bar component.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getDailyProgress } from '@modules/habits/actions';
import { z } from 'zod';

const querySchema = z.object({
  profileId: z.string().transform((val) => {
    const num = parseInt(val, 10);
    if (isNaN(num) || num <= 0) throw new Error('Invalid profileId');
    return num;
  }),
});

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const parsed = querySchema.safeParse({ profileId: url.searchParams.get('profileId') });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid or missing profileId query parameter' },
        { status: 400 }
      );
    }

    const profileId = parsed.data.profileId;
    const progress = await getDailyProgress(profileId);

    return NextResponse.json(progress);
  } catch (_err) {
    const err = _err as Error;
    if (err.message.includes('Not found')) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}