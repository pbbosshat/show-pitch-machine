/**
 * POST /api/scraper/run
 * Called by: dashboard "Run Now" button, cron jobs, curl
 * Auth: none (internal tool — no external exposure)
 * Body: { sources: 'all' | string[] }
 *
 * Two modes:
 *   1. Standard JSON (Accept: application/json or default):
 *      Queues scraper runs in scraper_runs table, returns { queued, runId }.
 *      Runs scrapers asynchronously in background — caller polls /api/scraper/log.
 *
 *   2. SSE streaming (Accept: text/event-stream):
 *      Streams one SSE event per scraper completion:
 *        data: { source, status, items, error?, elapsed }
 *      Ends with: data: { done: true, total_items }
 *      Client can display a live progress list without polling.
 *
 * Scrapers are dynamically imported to avoid loading puppeteer at Next.js startup.
 */

import { NextRequest, NextResponse } from 'next/server';
import { run, query } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// Map source key -> dynamic import path for all registered scrapers
const SCRAPER_MAP: Record<string, string> = {
  deadline: '@/scrapers/deadline',
  variety: '@/scrapers/variety',
  thr: '@/scrapers/thr',
  c21: '@/scrapers/c21',
  realscreen: '@/scrapers/realscreen',
  cynopsis: '@/scrapers/cynopsis',
  tvline: '@/scrapers/tvline',
  indiewire: '@/scrapers/indiewire',
  bc: '@/scrapers/bc',
  'production-weekly': '@/scrapers/production-weekly',
  'gmail-newsletters': '@/scrapers/gmail-newsletters',
};

const ALL_SOURCES = Object.keys(SCRAPER_MAP);

interface ScrapedArticle {
  source: string;
  url: string;
  headline: string;
  body: string;
  item_type: string;
  show_title?: string;
  network?: string;
  format?: string;
  genre?: string;
  episode_count?: number;
  location_type?: string;
  greenlit_date?: number;
  scraped_at: number;
}

// Persist scraped articles into trade_articles and update scraper tracking tables
function persistResults(source: string, runId: string, articles: ScrapedArticle[]) {
  for (const article of articles) {
    // Upsert by URL so re-runs don't create duplicates
    run(
      `INSERT INTO trade_articles (id, source, url, headline, body, item_type, scraped_at, embedded)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)
       ON CONFLICT(url) DO UPDATE SET
         headline = excluded.headline,
         body = excluded.body,
         item_type = excluded.item_type,
         scraped_at = excluded.scraped_at`,
      [uuidv4(), source, article.url, article.headline, article.body, article.item_type, article.scraped_at]
    );
  }

  // Update the source status table with latest run stats
  run(
    `INSERT INTO scraper_source_status (source, last_run_at, last_success_at, last_items, consecutive_failures)
     VALUES (?, ?, ?, ?, 0)
     ON CONFLICT(source) DO UPDATE SET
       last_run_at = excluded.last_run_at,
       last_success_at = excluded.last_success_at,
       last_items = excluded.last_items,
       consecutive_failures = 0`,
    [source, Date.now(), Date.now(), articles.length]
  );
}

// Mark a scraper run as failed and increment consecutive_failures counter
function markRunFailed(source: string, runId: string, errMsg: string) {
  run(
    `UPDATE scraper_runs SET status='error', completed_at=?, error_msg=? WHERE id=?`,
    [Date.now(), errMsg.slice(0, 1000), runId]
  );

  run(
    `INSERT INTO scraper_source_status (source, last_run_at, consecutive_failures)
     VALUES (?, ?, 1)
     ON CONFLICT(source) DO UPDATE SET
       last_run_at = excluded.last_run_at,
       consecutive_failures = consecutive_failures + 1`,
    [source, Date.now()]
  );
}

// Execute a single scraper and return articles — catches all errors gracefully.
// Uses a literal-string switch so webpack can statically trace all possible import
// paths; a variable import like `import(SCRAPER_MAP[source])` breaks in Next.js.
async function runScraper(source: string): Promise<{ articles: ScrapedArticle[]; error?: string }> {
  if (!SCRAPER_MAP[source]) return { articles: [], error: `Unknown source: ${source}` };

  try {
    let mod: { default: () => Promise<ScrapedArticle[]> };
    switch (source) {
      case 'deadline':          mod = await import('@/scrapers/deadline'); break;
      case 'variety':           mod = await import('@/scrapers/variety'); break;
      case 'thr':               mod = await import('@/scrapers/thr'); break;
      case 'c21':               mod = await import('@/scrapers/c21'); break;
      case 'realscreen':        mod = await import('@/scrapers/realscreen'); break;
      case 'cynopsis':          mod = await import('@/scrapers/cynopsis'); break;
      case 'tvline':            mod = await import('@/scrapers/tvline'); break;
      case 'indiewire':         mod = await import('@/scrapers/indiewire'); break;
      case 'bc':                mod = await import('@/scrapers/bc'); break;
      case 'production-weekly': mod = await import('@/scrapers/production-weekly'); break;
      case 'gmail-newsletters': mod = await import('@/scrapers/gmail-newsletters'); break;
      default: return { articles: [], error: `No import registered for: ${source}` };
    }
    const articles = await mod.default();
    return { articles };
  } catch (err) {
    return { articles: [], error: (err as Error).message };
  }
}

// Resolve source list from request body — always returns a non-empty array or throws
function resolveSourceList(sources: unknown): string[] {
  if (sources === 'all') return ALL_SOURCES;
  if (Array.isArray(sources) && sources.length > 0) {
    // Validate each source name against the known registry
    const invalid = (sources as string[]).filter((s) => !SCRAPER_MAP[s]);
    if (invalid.length > 0) throw new Error(`Unknown sources: ${invalid.join(', ')}`);
    return sources as string[];
  }
  throw new Error('Body must include { sources: "all" | string[] }');
}

export async function POST(request: NextRequest) {
  let body: { sources?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  let sources: string[];
  try {
    sources = resolveSourceList(body.sources);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  // --- SSE streaming path ---
  const acceptHeader = request.headers.get('accept') || '';
  if (acceptHeader.includes('text/event-stream')) {
    // Create scraper_runs rows up front so the UI can see them immediately
    const runIds: Record<string, string> = {};
    for (const source of sources) {
      const id = uuidv4();
      runIds[source] = id;
      run(
        `INSERT INTO scraper_runs (id, source, started_at, status, items_found) VALUES (?, ?, ?, 'running', 0)`,
        [id, source, Date.now()]
      );
    }

    // Build a ReadableStream that processes scrapers one-at-a-time and emits SSE events
    const stream = new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder();
        const emit = (data: object) => {
          controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        let totalItems = 0;

        for (const source of sources) {
          const runId = runIds[source];
          const start = Date.now();

          const { articles, error } = await runScraper(source);
          const elapsed = Date.now() - start;

          if (error) {
            markRunFailed(source, runId, error);
            emit({ source, status: 'error', items: 0, error, elapsed });
          } else {
            persistResults(source, runId, articles);
            run(
              `UPDATE scraper_runs SET status='success', completed_at=?, items_found=? WHERE id=?`,
              [Date.now(), articles.length, runId]
            );
            totalItems += articles.length;
            emit({ source, status: 'success', items: articles.length, elapsed });
          }
        }

        emit({ done: true, total_items: totalItems });
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }

  // --- Standard JSON path: queue runs and fire async background process ---
  const batchId = uuidv4();
  const runIds: string[] = [];

  for (const source of sources) {
    const id = uuidv4();
    runIds.push(id);
    run(
      `INSERT INTO scraper_runs (id, source, started_at, status, items_found) VALUES (?, ?, ?, 'running', 0)`,
      [id, source, Date.now()]
    );
  }

  // Fire scrapers in background — don't await so the HTTP response returns immediately
  (async () => {
    for (let i = 0; i < sources.length; i++) {
      const source = sources[i];
      const runId = runIds[i];
      const { articles, error } = await runScraper(source);

      if (error) {
        markRunFailed(source, runId, error);
      } else {
        persistResults(source, runId, articles);
        run(
          `UPDATE scraper_runs SET status='success', completed_at=?, items_found=? WHERE id=?`,
          [Date.now(), articles.length, runId]
        );
      }
    }
  })().catch(console.error);

  return NextResponse.json({ queued: sources, runId: batchId });
}
