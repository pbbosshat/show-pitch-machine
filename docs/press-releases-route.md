# Press Releases Route

## What This Does

Serves all press release content (80 Webflow-scraped articles + editorial pages) as a
functional Next.js route at `/press-releases` and `/press-releases/[slug]`.

The route replaced 80 hard-404 URLs from the Webflow-to-Railway migration with live
server-rendered pages that match the original Webflow visual design.

## Files Touched

| File | Change |
|------|--------|
| `app/(public)/press-releases/[slug]/page.tsx` | Created — dynamic detail page |
| `app/(public)/press-releases/page.tsx` | Updated — DB-driven list page |
| `docs/press-releases-route.md` | Created — this file |

## Data Flow

```
press_releases table (SQLite, migrations/002_marketing.sql)
  │
  ├── [slug]/page.tsx
  │     ├── generateStaticParams()  → SELECT slug FROM press_releases
  │     ├── generateMetadata()      → SELECT * FROM press_releases WHERE slug = ?
  │     └── page component          → SELECT * + SELECT 9 related
  │
  └── page.tsx (list)
        └── fetchDbPressReleases()  → SELECT id, headline, slug, published_at ORDER BY published_at DESC
```

All DB calls use `query<T>()` and `queryOne<T>()` from `@/lib/db` (Node 24 built-in `node:sqlite`).

## How to Add a New Press Release

### Option A — DB-backed (dynamic route, most common)

Insert a row into `press_releases`:

```sql
INSERT INTO press_releases (id, headline, slug, excerpt, body, source, source_url, published_at)
VALUES (
  'pr-' || lower(hex(randomblob(4))),
  'Headline Goes Here',
  'my-unique-slug',
  'One-sentence excerpt for SEO description.',
  '<p>Full article HTML here. Tags allowed: p, strong, em, a, ul, ol, li, br, h2–h6.</p>',
  'myentertainment.tv',           -- or NULL for internal
  'https://www.myentertainment.tv/press-releases/original-url',  -- or NULL
  unixepoch('2025-06-01')         -- publish date as unix seconds
);
```

The article will be live at `/press-releases/my-unique-slug` immediately (SSR).
It appears in the list page and sitemap automatically.

A new production build (`npm run build`) will pre-render it via `generateStaticParams`.

### Option B — Hand-authored editorial page (static route)

1. Create directory: `app/(public)/press-releases/your-slug/`
2. Add `page.tsx` with full Next.js metadata and JSX content (copy
   `film-commission-crew-directories/page.tsx` as a template).
3. Add a hardcoded entry to `EDITORIAL_ENTRIES` in `app/(public)/press-releases/page.tsx`
   so it appears in the list.

Do **not** add it to the DB — the static route takes precedence over `[slug]` anyway,
but keeping it out of the DB avoids duplicate URL confusion in the sitemap.

## Static vs Dynamic Route Conflict Resolution

Next.js 15 resolves route conflicts with this rule:
> A static `app/some-path/page.tsx` always wins over `app/[slug]/page.tsx` when the
> request path matches the static directory name exactly.

Concrete outcome:
- `GET /press-releases/film-commission-crew-directories` → served by the static `page.tsx` ✓
- `GET /press-releases/myentertainment-careers-assignment-desk` → served by the static `page.tsx` ✓
- `GET /press-releases/ghost-adventures-horror-at-joe-exotics-zoo` → falls to `[slug]/page.tsx` ✓

No special configuration is required. This is Next.js default behavior for App Router
(documented in Next.js 15 routing fundamentals: static segments take precedence over
dynamic segments at the same depth).

## Edge Cases & Decisions

### PRs without a body
If `body` is NULL, the detail page falls back to rendering `excerpt` as a plain `<p>`.
If both are NULL, a "Full article coming soon." placeholder is shown. No 404 is triggered —
the record exists in the DB, so the page is valid.

### PRs without a published_at date
The date line is omitted from the detail page and list page (empty string check).
schema.org `datePublished` is also omitted. This avoids "Invalid Date" in the UI.

### generateStaticParams at build time with empty DB
Wrapped in `try/catch` — returns `[]` if the DB is unreachable or the table doesn't exist
yet. The route still works via on-demand SSR; the catch prevents build failures in a
fresh Railway environment before migrations have run. Matches `sitemap.ts` pattern.

### dangerouslySetInnerHTML
Used for the `body` field, which is HTML scraped from Webflow.  XSS risk is
minimal because the content source is our own site (not user input), and
`sanitizeBody()` strips all `class=` and `style=` attributes before render.
Allowed tags: `<p>`, `<strong>`, `<em>`, `<a>`, `<ul>`, `<ol>`, `<li>`, `<br>`, `<h2>`–`<h6>`.

### Related press releases grid (9 items)
Matches the Webflow detail page design. Uses a `CSS grid` with
`repeat(auto-fit, minmax(280px, 1fr))` so it collapses to 2 → 1 columns on small screens.
Grid gap is 1px on a dark background — creates the appearance of hairline borders without
actual `border` properties.  Omitted entirely when `related.length === 0`.

### Schema.org on list page
`ItemList` wraps all items (editorial + DB).  This means the editorial entries appear as
`NewsArticle` items in the list schema with their hardcoded dates — which is correct.

## Gotchas

- **`node:sqlite` is synchronous** — all DB calls block.  This is intentional (see `lib/db.ts`).
  The calls are fast (< 1ms for indexed slug lookups) and the pages are server-rendered.
- **`query<T>()` returns raw SQLite types** — booleans are `0/1` integers, dates are unix
  seconds integers.  Always coerce before rendering.
- **The `docs/` directory is excluded from `tsconfig.json`** — markdown files here don't
  affect TypeScript compilation.
- **The `[slug]` directory name uses square brackets** — the filesystem creates a literal
  directory named `[slug]` on disk; Next.js treats this as a dynamic route segment.
