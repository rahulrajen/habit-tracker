// ============================================================================
// GET /api/habits/history?profileId=N&days=30
// Returns history data for the Recharts line chart component.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getHistoryData } from '@modules/habits/actions';
import { z } from 'zod';

const querySchema = z.object({
  profileId: z.string().transform((val) => {
    const num = parseInt(val, 10);
    if (isNaN(num) || num <= 0) throw new Error('Invalid profileId');
    return num;
  }),
  days: z.string().optional().transform((val) => {
    if (!val) return 30;
    const num = parseInt(val, 10);
    if (isNaN(num) || num <= 0) throw new Error('Invalid days parameter');
    return num;
  }),
});

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      profileId: url.searchParams.get('profileId'),
      days: url.searchParams.get('days'),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid or missing query parameters' },
        { status: 400 }
      );
    }

    const history = await getHistoryData({
      profile_id: parsed.data.profileId,
      days_back: parsed.data.days,
    });

    return NextResponse.json(history);
  } catch (_err) {
    const err = _err as Error;
    if (err.message.includes('Not found')) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}