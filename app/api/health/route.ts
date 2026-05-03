/**
 * GET /api/health
 * Called by: monitoring scripts, Uptime Robot, curl smoke tests
 * Auth: none
 * Response: { status: 'ok', timestamp: number, db: 'ok' | 'error', version: string }
 *
 * Performs a lightweight DB liveness check (SELECT 1) so we can distinguish
 * "process up but DB corrupt" from "process down" in monitoring dashboards.
 */

import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';

export async function GET() {
  let dbStatus: 'ok' | 'error' = 'ok';

  try {
    // Use queryOne instead of raw exec so we go through the same path as all routes
    queryOne<{ val: number }>('SELECT 1 AS val');
  } catch {
    dbStatus = 'error';
  }

  return NextResponse.json({
    status: 'ok',
    timestamp: Date.now(),
    db: dbStatus,
    version: '1.0.0',
  });
}
