#!/usr/bin/env python3
"""
One-shot script: read local SQLite → POST to mcp-server Railway ingest endpoints.
Pushes trade_articles, shows, buyer_companies, buyer_contacts, pitches.

Usage:
  python scripts/ingest-to-mcp-server.py

Env vars (or edit DEFAULTS below):
  MCP_INGEST_URL      base URL of the mcp-server service
  MCP_INGEST_KEY      INGEST_API_KEY
  DB_PATH             path to local db.sqlite
"""

import sqlite3, json, urllib.request, os, sys, math

# ── Config ─────────────────────────────────────────────────────────────────────
MCP_BASE = os.environ.get('MCP_INGEST_URL', 'https://mcp-server-production-f138.up.railway.app')
INGEST_KEY = os.environ.get('MCP_INGEST_KEY', 'ingest_dd8210af261f2c8053f6d38e5ca6217cd215340e73b7746e767123d6f43ae796')
DB_PATH = os.environ.get('DB_PATH', 'C:/Users/pb/Documents/Claude Code Local/My Entertainment/Show Pitch Machine/data/db.sqlite')
BATCH = 200  # rows per HTTP request

def post(path, payload):
    url = f'{MCP_BASE}{path}'
    data = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, method='POST', headers={
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {INGEST_KEY}',
    })
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            body = json.loads(r.read())
            return body
    except urllib.error.HTTPError as e:
        print(f'  ERROR {e.code}: {e.read().decode()[:300]}')
        return None

def batch_post(path, key, rows, label):
    total = len(rows)
    if total == 0:
        print(f'  {label}: 0 rows — skipping')
        return
    batches = math.ceil(total / BATCH)
    inserted = updated = 0
    for i in range(batches):
        chunk = rows[i*BATCH:(i+1)*BATCH]
        resp = post(path, {key: chunk})
        if resp:
            inserted += resp.get('inserted', 0)
            updated  += resp.get('updated', 0)
            pct = round((i+1) / batches * 100)
            print(f'  {label}: batch {i+1}/{batches} ({pct}%) — +{resp.get("inserted",0)} new, ~{resp.get("updated",0)} updated')
        else:
            print(f'  {label}: batch {i+1}/{batches} FAILED')
    print(f'  {label}: DONE — {inserted} inserted, {updated} updated of {total} total')

def row_to_dict(cursor, row):
    return {cursor.description[i][0]: row[i] for i in range(len(row))}

con = sqlite3.connect(DB_PATH)
con.row_factory = sqlite3.Row
cur = con.cursor()

# ── 1. Trade articles ──────────────────────────────────────────────────────────
print('\n[1/5] trade_articles')
cur.execute('SELECT id, source, url, headline, body, item_type, scraped_at FROM trade_articles WHERE url IS NOT NULL')
articles = [dict(r) for r in cur.fetchall()]
# scraped_at from Gmail scraper is in milliseconds; Postgres INTEGER max is ~2.1B so convert to seconds
for a in articles:
    if a.get('scraped_at') and a['scraped_at'] > 1_000_000_000_000:
        a['scraped_at'] = a['scraped_at'] // 1000
batch_post('/ingest/articles', 'articles', articles, 'articles')

# ── 2. Shows ───────────────────────────────────────────────────────────────────
print('\n[2/5] shows')
cur.execute('''SELECT id, title, title_normalized, network, production_company,
               showrunner, host, format, genre, status, greenlit_date,
               source, source_url, data_source
               FROM shows WHERE title IS NOT NULL AND title_normalized IS NOT NULL''')
shows = [dict(r) for r in cur.fetchall()]
batch_post('/ingest/shows', 'shows', shows, 'shows')

# ── 3. Buyer companies ─────────────────────────────────────────────────────────
print('\n[3/5] buyer_companies')
cur.execute('SELECT id, name, type, tier FROM buyer_companies WHERE name IS NOT NULL')
companies = [dict(r) for r in cur.fetchall()]

# ── 4. Buyer contacts ──────────────────────────────────────────────────────────
print('\n[4/5] buyer_contacts (sent together with companies)')
cur.execute('''SELECT id, company_id, name, email, title, mandate_statement,
               activity_status, last_greenlit_date
               FROM buyer_contacts WHERE name IS NOT NULL''')
contacts = [dict(r) for r in cur.fetchall()]
batch_post('/ingest/buyers', 'companies', companies, 'companies+contacts (companies leg)')
batch_post('/ingest/buyers', 'contacts', contacts, 'companies+contacts (contacts leg)')

# ── 5. Pitches ─────────────────────────────────────────────────────────────────
print('\n[5/5] pitches')
cur.execute('''SELECT id, ip_id, buyer_company_id, buyer_contact_id,
               pitch_date, outcome, pass_reason, pass_reason_cat
               FROM pitches''')
pitches = [dict(r) for r in cur.fetchall()]
batch_post('/ingest/pipeline', 'pitches', pitches, 'pitches')

con.close()
print('\nAll done.')
