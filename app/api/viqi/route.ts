// POST /api/viqi — Internal proxy: mcp-server → Vitrina VIQI API
//
// Caller:   mcp-server Railway service (query_viqi MCP tool)
// Auth:     Authorization: Bearer <VIQI_PROXY_SECRET>
// Body:     { query: string }
// Response: { data: { answer: string } }
//
// The mcp-server has no Puppeteer; this Next.js service does. All Vitrina auth
// (CDP token grab or headless Puppeteer login) happens here, then the query is
// forwarded to Vitrina's VIQI endpoint and the synthesized answer returned.

import { NextRequest, NextResponse } from 'next/server';
import { queryViqi } from '@/lib/vitrina/client';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const secret = process.env.VIQI_PROXY_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'VIQI_PROXY_SECRET not configured' }, { status: 500 });
  }

  const auth = request.headers.get('authorization') ?? '';
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({})) as { query?: string };
  const query = body.query?.trim();
  if (!query) {
    return NextResponse.json({ error: 'query is required' }, { status: 400 });
  }

  const answer = await queryViqi(query);
  return NextResponse.json({ data: { answer } });
}
