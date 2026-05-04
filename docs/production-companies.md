# Production Companies — Data Model & Import Guide

## What This Is

The production companies system is a searchable, filterable directory of ~780 Canadian, US, and UK prodcos enriched from multiple spreadsheet sources. It powers the `/market/prodcos` list page and individual detail pages at `/market/prodcos/[id]`.

---

## Data Sources

### 1. Primary Prodco Spreadsheet (`1kdByxpDBut-LSZhWskg_nyA5AllRc1HMA46tG1PHKY4`)
**Script:** `scripts/import-prodcos-sheet.ts`

Tabs imported:
| Tab | Country | Rows | Notes |
|-----|---------|------|-------|
| Canadian | CA | ~688 | Main Canadian prodco list |
| UK | UK | ~8 | UK-based companies |
| US Based | US | ~69 | US companies |
| MM 9/29 | — | ~107 | Outreach email list — sets `outreach_status` on `prodco_contacts` |
| Acquistions | — | ~21 | Ownership changes — sets `ownership_type='studio_owned'`, `parent_company` |

**Important:** The Acquisitions tab is **misspelled** in the spreadsheet as `Acquistions` (missing the 'i'). The import script uses `'Acquistions'` as the range name.

Fields populated: `name`, `hq_city`, `region`, `country`, `bio`, `email`, `phone`, `linkedin_url`, `twitter_url`, `youtube_url`, `facebook_url`, `organization_type`, `genres`, `current_shows`, `current_networks`, `website`, `source_sheet`

---

### 2. CMPA Member Directory (`1DJWb3Lpr5uJ0-R04wY9o_i6mDbVq_I-kWdGLOwwrtv8`)
**Script:** `scripts/import-cmpa-sheet.ts`

Source: Canadian Media Producers Association member directory (single Sheet1 tab, ~549 rows).

Fields populated:
- `is_cmpa_member = 1` — always set for matched rows (used for badge + filter)
- `primary_platform` — Television, Theatrical, Interactive media, Other
- `production_model` — 100% Domestic, Domestic + Int'l financing, International Treaty Co-production, Service Production, Co-Venture, Other
- `bio`, `twitter_url`, `website`, `organization_type`, `hq_city` — filled in only when currently NULL (non-destructive merge)

**Matching strategy:** `LOWER(cmpa_name) == name_normalized` (exact). Names in this sheet are clean — no fuzzy matching needed. ~514 of 549 match existing DB rows; ~35 are net-new inserts.

---

## Database Schema

**Table:** `production_companies`

Key columns by migration:

| Column | Migration | Notes |
|--------|-----------|-------|
| `id`, `name`, `name_normalized` | 001 | `name_normalized = LOWER(name)` — used for all matching |
| `ownership_type` | 001 | `independent` / `studio_owned` / `network_owned` |
| `strategic_tag` | 001 | `co_pro_partner` / `acquisition_target` / `competitor` / `watch_list` |
| `genres`, `website`, `hq_city`, `notes` | 001 | Base fields |
| `email`, `phone`, `country`, `region` | 012 | Spreadsheet enrichment |
| `bio`, `linkedin_url`, `twitter_url`, `youtube_url`, `facebook_url` | 012 | Spreadsheet enrichment |
| `organization_type`, `contact_status`, `contacted_detail` | 012 | Outreach tracking |
| `current_shows`, `current_networks` | 012 | JSON array strings — parse in client |
| `employee_count`, `source_sheet` | 012 | Metadata |
| `is_cmpa_member` | 013 | `1` if verified CMPA member, `0` default |
| `primary_platform` | 013 | CMPA primary distribution platform |
| `production_model` | 013 | CMPA production model classification |

**Related tables:**
- `prodco_contacts` — named individuals at the company (owner, exec, etc.)
- `prodco_email_threads` — future Gmail cross-reference (schema in place, not yet populated)

---

## Key Technical Gotcha: Server Component → Client Component Serialization

Next.js 15 **cannot serialize null-prototype objects** across the Server→Client boundary. SQLite's `node:sqlite` returns rows with null prototypes by default.

**Fix (mandatory for any page passing DB rows to a Client Component):**

```typescript
// WRONG — will throw "Classes or null prototypes are not supported"
const prodcos = query<ProductionCompany>('SELECT * FROM production_companies');

// CORRECT — spread into plain objects first
const prodcos = query<ProductionCompany>('SELECT * FROM production_companies')
  .map(p => ({ ...p }));
```

This only applies when the data crosses the server→client boundary (i.e., passed as props to a `'use client'` component). Pure server components rendering JSX directly are fine without it.

---

## Auth Bypass for Server Components

The `/market/*` routes require a valid `spm_session` cookie (set by the auth middleware). Server components must NOT use internal HTTP fetches to `/api/*` routes — the middleware intercepts them and returns a redirect to `/login`.

**Pattern:** Always use direct DB queries in server components:

```typescript
// WRONG — middleware intercepts, returns 307 redirect, fetchJSON gets HTML
const prodcos = await fetchJSON('http://localhost:3000/api/prodcos');

// CORRECT — bypasses middleware entirely
import { query } from '@/lib/db';
const prodcos = query<ProductionCompany>('SELECT * FROM production_companies ORDER BY name ASC')
  .map(p => ({ ...p }));
```

**Dev session bypass** (for testing without password): `GET /api/dev-session?email=1%40gototeam.com&redirect=/market/prodcos`
The only team user in the dev DB has email `1@gototeam.com`.

---

## Running the Imports

```bash
# Primary spreadsheet (Canadian/UK/US + outreach + acquisitions)
npx tsx scripts/import-prodcos-sheet.ts
npx tsx scripts/import-prodcos-sheet.ts --dry-run

# CMPA member directory
npx tsx scripts/import-cmpa-sheet.ts
npx tsx scripts/import-cmpa-sheet.ts --dry-run
```

Both scripts call `initDb()` internally — they apply any pending migrations before importing.

---

## UI Features

### List Page (`/market/prodcos`)
- **6 filter rows:** Strategic Tag, Ownership, Country (CA/US/UK), Contacted (Y/N), CMPA (member/non-member)
- **Search:** matches name, city, region, bio, current_shows, current_networks, genres, notes
- **CMPA badge:** teal `CMPA` pill inline with company name
- **Country badges:** CA=blue, US=amber, UK=purple
- **Result count:** "N of M companies"
- **Edit modal:** inline edit for all enrichment fields

### Detail Page (`/market/prodcos/[id]`)
- Header: name, country badge, city, org type, employee count, primary platform, production model
- **CMPA badge:** "✓ CMPA Member" teal pill in header badge row (only if `is_cmpa_member = 1`)
- Bio blockquote
- Social/contact strip (LinkedIn, Twitter, YouTube, Facebook, Email, Phone)
- Current Programming (active shows + networks as chips)
- Key Contacts table (owner badge, outreach status color codes)
- Recent Deals + Buyers grid (2fr / 1fr)

---

## Future: Email Cross-Reference

The `prodco_email_threads` table is in place (migration 012). The planned script `scripts/cross-ref-prodco-emails.ts` will:
1. Pull Gmail threads from the sent/received history
2. Match thread email domains against prodco `email` and `prodco_contacts.email`
3. Insert rows into `prodco_email_threads`
4. Surface on the detail page as an "Email History" section

This has not been built yet.
