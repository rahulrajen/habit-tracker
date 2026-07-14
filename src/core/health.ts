// ============================================================================
// Health Check — backs /api/health endpoint
// Verifies DB connectivity on every poll/request
// ============================================================================

import { db } from './db';
import { sql } from 'drizzle-orm';
import { getLogger } from './logger';

const log = getLogger('core/health');

export interface HealthResult {
  status: 'ok' | 'error';
  timestamp: string;
  checks: {
    database: {
      status: 'ok' | 'error';
      message?: string;
    };
  };
}

/**
 * Run a health check — returns structured object + logs.
 */
export async function runHealthCheck(): Promise<HealthResult> {
  const result: HealthResult = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    checks: {
      database: { status: 'error' }, // default to error, override if success
    },
  };

  try {
    await db.execute(sql`SELECT 1`);
    result.checks.database.status = 'ok';
    log.debug('Database health check passed');
  } catch (error) {
    result.status = 'error';
    const msg = error instanceof Error ? error.message : 'Unknown DB error';
    result.checks.database.message = msg;
    log.error(`Database health check failed: ${msg}`, error);
  }

  return result;
}