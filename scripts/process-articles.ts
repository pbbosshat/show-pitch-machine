// scripts/process-articles.ts
//
// Entity extraction and linking pipeline for trade articles.
// For each unprocessed trade_article, calls Groq to extract people, shows, and
// production companies, then fuzzy-matches them against the DB and writes
// entity_article_links rows. High-confidence matches trigger auto-applied
// field updates (exec moves, cancellations, mandate statements).
//
// Run via:
//   npx tsx --env-file=.env scripts/process-articles.ts
//
// CLI flags:
//   --reprocess          Re-run articles that already have processed_at set
//   --dry-run            Extract + match but do NOT write to DB
//   --limit=N            Process only N articles (useful for testing)
//   --item-type=<type>   Filter to a specific item_type (e.g. exec-move, cancelled)
//
// Prerequisites:
//   GROQ_API_KEY in environment or .env

// Suppress node:sqlite experimental warning before any imports
process.removeAllListeners('warning');
process.on('warning', (w) => {
  if (w.name === 'ExperimentalWarning' && w.message.includes('sqlite')) return;
  console.warn(w.name, w.message);
});

import { randomUUID } from 'crypto';
import Groq from 'groq-sdk';
import { initDb, run, query } from '../lib/db';

// ── Constants ─────────────────────────────────────────────────────────────────

// Model to use for entity extraction. Override via env for cost/speed tradeoffs.
const MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

// Minimum fuzzy-match score to create a link row
const LINK_THRESHOLD = 0.6;

// Minimum score required to auto-apply a field update to an entity row
const AUTO_APPLY_THRESHOLD = 0.75;

// Articles processed per Groq API batch before sleeping to avoid rate limits
const BATCH_SIZE = 10;

// Delay between batches in milliseconds
const BATCH_DELAY_MS = 200;

// ── Groq client ───────────────────────────────────────────────────────────────

// Single client instance — groq-sdk manages connection pooling internally
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ── Types ─────────────────────────────────────────────────────────────────────

interface TradeArticle {
  id: string;
  headline: string;
  body: string | null;
  brief: string | null;
  item_type: string | null;
  source: string | null;
  url: string | null;
  scraped_at: number | null;
}

interface ExtractedPerson {
  name: string;
  old_title?: string;
  old_company?: string;
  new_title?: string;
  new_company?: string;
  type: 'exec-move' | 'mentioned';
}

interface ExtractedShow {
  title: string;
  network?: string;
  status: 'cancelled' | 'greenlit' | 'mentioned';
}

interface ExtractedProductionCompany {
  name: string;
}

interface GroqExtraction {
  people: ExtractedPerson[];
  shows: ExtractedShow[];
  production_companies: ExtractedProductionCompany[];
}

interface BuyerContact {
  id: string;
  name: string;
  title: string | null;
  company_id: string | null;
  mandate_statement: string | null;
}

interface BuyerCompany {
  id: string;
  name: string;
}

interface Show {
  id: string;
  title: string;
  title_normalized: string | null;
  air_status: string | null;
  scraped_at: number | null;
}

interface ProductionCompany {
  id: string;
  name: string;
  name_normalized: string | null;
}

// ── Fuzzy Matching ────────────────────────────────────────────────────────────

/**
 * Normalize a string for fuzzy comparison — lowercase, strip punctuation,
 * collapse whitespace. Ensures "HBO Max" and "hbo max" compare as equal.
 */
function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Compute a similarity score (0.0–1.0) between two strings using bigram overlap.
 * Exact match → 1.0; substring containment → 0.85; otherwise bigram Dice coefficient.
 * This avoids external packages while handling typos and partial names well enough
 * for TV industry entity names.
 */
function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);

  // Exact match after normalization
  if (na === nb) return 1.0;

  // One is a substring of the other — very likely a match (e.g. "HBO" vs "HBO Max")
  if (na.includes(nb) || nb.includes(na)) return 0.85;

  // Bigram Dice coefficient for partial / transposed names
  const bigrams = (s: string): Set<string> =>
    new Set(Array.from({ length: Math.max(0, s.length - 1) }, (_, i) => s.slice(i, i + 2)));

  const ab = bigrams(na);
  const bb = bigrams(nb);

  // Can't compare strings with no bigrams (length < 2)
  if (ab.size === 0 || bb.size === 0) return 0;

  const intersection = [...ab].filter((b) => bb.has(b)).length;
  return (2 * intersection) / (ab.size + bb.size);
}

// ── Groq Extraction ───────────────────────────────────────────────────────────

/**
 * Call Groq to extract structured TV industry entities from a trade article.
 * Returns a safe empty structure on any API or parse error so a single bad
 * article never stops the batch.
 */
async function extractEntities(article: TradeArticle): Promise<GroqExtraction> {
  const EMPTY: GroqExtraction = { people: [], shows: [], production_companies: [] };

  try {
    const response = await groq.chat.completions.create({
      model: MODEL,
      // Temperature 0 for deterministic JSON — we need consistent field names
      temperature: 0,
      max_tokens: 1024,
      messages: [
        {
          role: 'system',
          content:
            'You are a TV industry data extractor. Extract structured entities from trade article headlines and body text. Return JSON only.',
        },
        {
          role: 'user',
          content:
            `Headline: ${article.headline}\n\nBody: ${(article.body ?? '').slice(0, 3000)}\n\n` +
            `Extract:\n` +
            `- people: array of {name, old_title, old_company, new_title, new_company, type: 'exec-move'|'mentioned'}\n` +
            `- shows: array of {title, network, status: 'cancelled'|'greenlit'|'mentioned'}\n` +
            `- production_companies: array of {name}\n\n` +
            `Return JSON: { "people": [...], "shows": [...], "production_companies": [...] }`,
        },
      ],
    });

    const text = response.choices[0]?.message?.content?.trim() ?? '';

    // Strip any accidental markdown code fences before parsing
    const cleaned = text.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '');
    const parsed = JSON.parse(cleaned) as GroqExtraction;

    // Validate top-level arrays exist; default to empty if missing
    return {
      people: Array.isArray(parsed.people) ? parsed.people : [],
      shows: Array.isArray(parsed.shows) ? parsed.shows : [],
      production_companies: Array.isArray(parsed.production_companies) ? parsed.production_companies : [],
    };
  } catch (err) {
    // Log but never throw — a single bad article must not halt the batch
    console.error(
      `  ⚠️  Groq extraction failed for article ${article.id}: ${(err as Error).message}`
    );
    return EMPTY;
  }
}

// ── DB Helpers ────────────────────────────────────────────────────────────────

/**
 * Write one entity_article_links row. Silently ignores duplicate (ON CONFLICT DO NOTHING)
 * so re-runs with --reprocess don't create duplicate link rows.
 */
function insertLink(opts: {
  entityType: string;
  entityId: string;
  articleId: string;
  linkReason: string;
  confidence: number;
  autoApplied?: boolean;
  appliedField?: string;
  appliedValue?: string;
  dryRun: boolean;
}): void {
  if (opts.dryRun) return;

  run(
    `INSERT INTO entity_article_links
       (id, entity_type, entity_id, article_id, link_reason, confidence, auto_applied, applied_field, applied_value)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(entity_type, entity_id, article_id) DO NOTHING`,
    [
      randomUUID(),
      opts.entityType,
      opts.entityId,
      opts.articleId,
      opts.linkReason,
      opts.confidence,
      opts.autoApplied ? 1 : 0,
      opts.appliedField ?? null,
      opts.appliedValue ?? null,
    ]
  );
}

// ── Per-Article Processing ────────────────────────────────────────────────────

/**
 * Process a single trade article:
 *  1. Extract entities via Groq
 *  2. Fuzzy-match against buyer_contacts, shows, production_companies
 *  3. Create entity_article_links rows for matches >= LINK_THRESHOLD
 *  4. Auto-apply DB updates for matches >= AUTO_APPLY_THRESHOLD
 *  5. Mark article processed_at = now
 *
 * Returns { linksCreated, autoApplied } counts.
 */
async function processArticle(
  article: TradeArticle,
  opts: { dryRun: boolean }
): Promise<{ linksCreated: number; autoApplied: number }> {
  let linksCreated = 0;
  let autoApplied = 0;

  const { people, shows, production_companies } = await extractEntities(article);

  // ── Buyer contact matching ────────────────────────────────────────────────

  if (people.length > 0) {
    // Load all buyer contacts once per article (avoid N+1)
    const contacts = query<BuyerContact>(
      'SELECT id, name, title, company_id, mandate_statement FROM buyer_contacts'
    );

    for (const person of people) {
      if (!person.name) continue;

      // Find best-matching contact by name similarity
      let bestContact: BuyerContact | null = null;
      let bestScore = 0;

      for (const contact of contacts) {
        const score = similarity(person.name, contact.name);
        if (score > bestScore) {
          bestScore = score;
          bestContact = contact;
        }
      }

      if (!bestContact || bestScore < LINK_THRESHOLD) continue;

      // Determine link reason based on extraction type and article item_type
      const linkReason =
        person.type === 'exec-move' || article.item_type === 'exec-move'
          ? 'exec_move'
          : article.item_type === 'mandate-statement'
          ? 'mandate'
          : 'mentioned';

      const shouldAutoApply = bestScore >= AUTO_APPLY_THRESHOLD;

      // ── exec-move auto-apply ────────────────────────────────────────────────
      if (
        shouldAutoApply &&
        (person.type === 'exec-move' || article.item_type === 'exec-move') &&
        person.new_title
      ) {
        // Insert a buyer_employer_history row to record the previous role ending
        if (bestContact.title || bestContact.company_id) {
          run(
            `INSERT INTO buyer_employer_history
               (id, contact_id, company_name, company_type, title, is_buyer_seat, start_date, end_date)
             VALUES (?, ?, ?, ?, ?, 1, NULL, ?)`,
            [
              randomUUID(),
              bestContact.id,
              // Resolve company name from buyer_companies if we have the id
              bestContact.company_id
                ? (query<{ name: string }>(
                    'SELECT name FROM buyer_companies WHERE id = ?',
                    [bestContact.company_id]
                  )[0]?.name ?? null)
                : (person.old_company ?? null),
              null, // company_type unknown from article text
              bestContact.title ?? person.old_title ?? null,
              // Use article scraped_at as a proxy for when the move was announced
              article.scraped_at
                ? new Date(article.scraped_at).toISOString().slice(0, 10)
                : new Date().toISOString().slice(0, 10),
            ]
          );
        }

        // Update buyer_contacts with the new title (and new company if found)
        let newCompanyId: string | null = null;

        if (person.new_company) {
          // Try to resolve the new company name to a buyer_companies row
          const companies = query<BuyerCompany>('SELECT id, name FROM buyer_companies');
          let bestCompany: BuyerCompany | null = null;
          let bestCompanyScore = 0;
          for (const co of companies) {
            const score = similarity(person.new_company, co.name);
            if (score > bestCompanyScore) {
              bestCompanyScore = score;
              bestCompany = co;
            }
          }
          if (bestCompany && bestCompanyScore >= AUTO_APPLY_THRESHOLD) {
            newCompanyId = bestCompany.id;
          }
        }

        if (!opts.dryRun) {
          if (newCompanyId) {
            run(
              'UPDATE buyer_contacts SET title = ?, company_id = ? WHERE id = ?',
              [person.new_title, newCompanyId, bestContact.id]
            );
          } else {
            run(
              'UPDATE buyer_contacts SET title = ? WHERE id = ?',
              [person.new_title, bestContact.id]
            );
          }
        }

        insertLink({
          entityType: 'buyer_contact',
          entityId: bestContact.id,
          articleId: article.id,
          linkReason,
          confidence: bestScore,
          autoApplied: true,
          appliedField: 'title',
          appliedValue: person.new_title,
          dryRun: opts.dryRun,
        });

        autoApplied++;
      } else if (
        shouldAutoApply &&
        article.item_type === 'mandate-statement' &&
        article.body
      ) {
        // ── mandate-statement auto-apply ──────────────────────────────────────
        // Insert into mandate_updates and overwrite the contact's live mandate fields
        const statedDate = article.scraped_at ?? Date.now();

        if (!opts.dryRun) {
          run(
            `INSERT INTO mandate_updates (id, contact_id, statement, source, source_url, stated_date, scraped_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              randomUUID(),
              bestContact.id,
              article.brief ?? article.body.slice(0, 500),
              article.source ?? null,
              article.url ?? null,
              statedDate,
              article.scraped_at ?? Date.now(),
            ]
          );

          run(
            `UPDATE buyer_contacts
             SET mandate_statement = ?,
                 mandate_source = ?,
                 mandate_date = ?
             WHERE id = ?`,
            [
              article.brief ?? article.body.slice(0, 500),
              article.url ?? article.source ?? null,
              new Date(statedDate).toISOString().slice(0, 10),
              bestContact.id,
            ]
          );
        }

        insertLink({
          entityType: 'buyer_contact',
          entityId: bestContact.id,
          articleId: article.id,
          linkReason: 'mandate',
          confidence: bestScore,
          autoApplied: true,
          appliedField: 'mandate_statement',
          appliedValue: (article.brief ?? (article.body ?? '').slice(0, 100)),
          dryRun: opts.dryRun,
        });

        autoApplied++;
      } else {
        // No auto-apply — still record the link so the UI can surface it
        insertLink({
          entityType: 'buyer_contact',
          entityId: bestContact.id,
          articleId: article.id,
          linkReason,
          confidence: bestScore,
          dryRun: opts.dryRun,
        });
      }

      linksCreated++;
    }
  }

  // ── Show matching ──────────────────────────────────────────────────────────

  if (shows.length > 0) {
    const dbShows = query<Show>(
      'SELECT id, title, title_normalized, air_status, scraped_at FROM shows'
    );

    for (const extracted of shows) {
      if (!extracted.title) continue;

      let bestShow: Show | null = null;
      let bestScore = 0;

      for (const dbShow of dbShows) {
        // Prefer matching against title_normalized if available
        const compareAgainst = dbShow.title_normalized ?? dbShow.title;
        const score = similarity(extracted.title, compareAgainst);
        if (score > bestScore) {
          bestScore = score;
          bestShow = dbShow;
        }
      }

      if (!bestShow || bestScore < LINK_THRESHOLD) continue;

      // Derive the link reason from the article item_type or extracted status
      const isCancelled =
        article.item_type === 'cancelled' || extracted.status === 'cancelled';
      const linkReason = isCancelled ? 'cancelled' : extracted.status === 'greenlit' ? 'greenlit' : 'mentioned';

      const shouldAutoApply = bestScore >= AUTO_APPLY_THRESHOLD;

      if (shouldAutoApply && isCancelled && bestShow.air_status !== 'off_air') {
        // ── cancelled auto-apply ────────────────────────────────────────────
        const offAirDate = article.scraped_at ?? Date.now();

        if (!opts.dryRun) {
          run(
            "UPDATE shows SET air_status = 'off_air', off_air_date = ? WHERE id = ?",
            [offAirDate, bestShow.id]
          );
        }

        insertLink({
          entityType: 'show',
          entityId: bestShow.id,
          articleId: article.id,
          linkReason,
          confidence: bestScore,
          autoApplied: true,
          appliedField: 'air_status',
          appliedValue: 'off_air',
          dryRun: opts.dryRun,
        });

        autoApplied++;
      } else {
        insertLink({
          entityType: 'show',
          entityId: bestShow.id,
          articleId: article.id,
          linkReason,
          confidence: bestScore,
          dryRun: opts.dryRun,
        });
      }

      linksCreated++;
    }
  }

  // ── Production company matching ────────────────────────────────────────────

  if (production_companies.length > 0) {
    const dbProdcos = query<ProductionCompany>(
      'SELECT id, name, name_normalized FROM production_companies'
    );

    for (const extracted of production_companies) {
      if (!extracted.name) continue;

      let bestProdco: ProductionCompany | null = null;
      let bestScore = 0;

      for (const dbProdco of dbProdcos) {
        const compareAgainst = dbProdco.name_normalized ?? dbProdco.name;
        const score = similarity(extracted.name, compareAgainst);
        if (score > bestScore) {
          bestScore = score;
          bestProdco = dbProdco;
        }
      }

      if (!bestProdco || bestScore < LINK_THRESHOLD) continue;

      insertLink({
        entityType: 'production_company',
        entityId: bestProdco.id,
        articleId: article.id,
        linkReason: 'mentioned',
        confidence: bestScore,
        dryRun: opts.dryRun,
      });

      linksCreated++;
    }
  }

  // ── Mark article processed ─────────────────────────────────────────────────
  if (!opts.dryRun) {
    run('UPDATE trade_articles SET processed_at = ? WHERE id = ?', [Date.now(), article.id]);
  }

  return { linksCreated, autoApplied };
}

// ── CLI Arg Parsing ───────────────────────────────────────────────────────────

interface CliArgs {
  reprocess: boolean;
  dryRun: boolean;
  limit: number | null;
  itemType: string | null;
}

function parseArgs(): CliArgs {
  const argv = process.argv.slice(2);
  const args: CliArgs = { reprocess: false, dryRun: false, limit: null, itemType: null };

  for (const arg of argv) {
    if (arg === '--reprocess') args.reprocess = true;
    if (arg === '--dry-run') args.dryRun = true;
    if (arg.startsWith('--limit=')) args.limit = parseInt(arg.slice('--limit='.length), 10);
    if (arg.startsWith('--item-type=')) args.itemType = arg.slice('--item-type='.length);
  }

  return args;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs();

  // Ensure migrations are up to date (creates entity_article_links and processed_at if needed)
  initDb();

  console.log('\n🗞️  Article Entity Processor\n');
  if (args.dryRun) console.log('  ⚠️  DRY RUN — no DB writes\n');

  // ── Build query to fetch articles for processing ──────────────────────────

  // Base WHERE clause: unprocessed unless --reprocess flag is set
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (!args.reprocess) {
    conditions.push('processed_at IS NULL');
  }

  if (args.itemType) {
    conditions.push('item_type = ?');
    params.push(args.itemType);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Fetch article metadata — brief is a computed column that may not exist;
  // use a sub-select to avoid hard failures on older schema versions
  let articles = query<TradeArticle>(
    `SELECT id, headline, body, brief, item_type, source, url, scraped_at FROM trade_articles ${whereClause} ORDER BY scraped_at DESC`,
    params
  );

  if (args.limit !== null && !isNaN(args.limit)) {
    articles = articles.slice(0, args.limit);
  }

  const total = articles.length;

  if (total === 0) {
    console.log('  ✓  No articles to process. Pass --reprocess to re-run all.');
    return;
  }

  console.log(`  📰  ${total} article(s) to process`);
  console.log(`  🤖  Model: ${MODEL}`);
  console.log(`  🔗  Link threshold: ${LINK_THRESHOLD} | Auto-apply threshold: ${AUTO_APPLY_THRESHOLD}`);
  if (args.itemType) console.log(`  🔍  Filter: item_type = ${args.itemType}`);
  console.log();

  // ── Process in batches ────────────────────────────────────────────────────

  let totalLinks = 0;
  let totalAutoApplied = 0;
  let processedCount = 0;
  const startTime = Date.now();

  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const batch = articles.slice(i, i + BATCH_SIZE);

    // Process each article in the batch sequentially to avoid slamming the Groq API.
    // Parallel would be faster but risks 429s on the free tier.
    for (const article of batch) {
      const shortHeadline = article.headline.slice(0, 60);
      process.stdout.write(`  [${processedCount + 1}/${total}] ${shortHeadline.padEnd(62)}`);

      const { linksCreated, autoApplied } = await processArticle(article, {
        dryRun: args.dryRun,
      });

      totalLinks += linksCreated;
      totalAutoApplied += autoApplied;
      processedCount++;

      const suffix = linksCreated > 0
        ? `🔗 ${linksCreated} link(s)${autoApplied > 0 ? ` ✏️  ${autoApplied} applied` : ''}`
        : '—';
      console.log(suffix);
    }

    // Rate-limit pause between batches (skip after final batch)
    if (i + BATCH_SIZE < articles.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const totalInDb = query<{ cnt: number }>(
    'SELECT COUNT(*) AS cnt FROM entity_article_links'
  )[0]?.cnt ?? 0;

  console.log('\n─────────────────────────────────────────────');
  console.log(`  ✅  Articles processed : ${processedCount}`);
  console.log(`  🔗  Links created      : ${totalLinks}`);
  console.log(`  ✏️   Auto-applies fired  : ${totalAutoApplied}`);
  console.log(`  📊  Total links in DB  : ${totalInDb}`);
  console.log(`  ⏱️   Elapsed            : ${elapsed}s`);
  if (args.dryRun) console.log('\n  (Dry run — nothing written to DB)');
  console.log('─────────────────────────────────────────────\n');
}

// Exported entry point for programmatic use (called by scrape-all.ts after each run).
// Only processes unprocessed articles — same as running with no flags.
export async function processNewArticles(): Promise<void> {
  const articles = query<TradeArticle>(
    `SELECT id, headline, body, brief, item_type, source, url, scraped_at
     FROM trade_articles WHERE processed_at IS NULL ORDER BY scraped_at DESC`
  );
  if (articles.length === 0) return;

  console.log(`  📰  Processing ${articles.length} new article(s)…`);
  let links = 0, applied = 0;

  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const batch = articles.slice(i, i + BATCH_SIZE);
    for (const article of batch) {
      const { linksCreated, autoApplied } = await processArticle(article, { dryRun: false });
      links += linksCreated;
      applied += autoApplied;
    }
    if (i + BATCH_SIZE < articles.length) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  console.log(`  ✅  ${links} link(s) created, ${applied} auto-update(s) applied`);
}

// CLI entry point — only runs when executed directly, not when imported
if (process.argv[1]?.endsWith('process-articles.ts') || process.argv[1]?.endsWith('process-articles.js')) {
  main().then(() => process.exit(0)).catch((err) => {
    console.error('\n[FATAL]', err);
    process.exit(1);
  });
}
