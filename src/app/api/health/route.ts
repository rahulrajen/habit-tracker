import { NextResponse } from 'next/server';
import { runHealthCheck } from '@core/health';

export async function GET() {
  try {
    const result = await runHealthCheck();
    const status = result.status === 'ok' ? 200 : 503;
    return NextResponse.json(result, { status });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        checks: { database: { status: 'error', message: error instanceof Error ? error.message : 'Unknown' } },
      },
      { status: 503 }
    );
  }
}