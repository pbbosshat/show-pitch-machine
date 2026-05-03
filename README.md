This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js).

## Show Pitch Machine — MY Entertainment

TV pitch intelligence platform for MYE development. Scrapes trade publications, tracks buyer mandates and greenlits, manages a pitch pipeline with email-to-kanban automation, and generates buyer-facing pitch portals.

## Getting Started

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## UI Architecture

All pages live under `app/` using Next.js 15 App Router. Server components fetch data directly; client components handle interactivity (search, drag-drop, modals).

### Pages

| Route | File | Description |
|---|---|---|
| `/` | `app/page.tsx` | Dashboard — bento grid: buyers, greenlits, pipeline, genre pulse |
| `/intelligence` | `app/intelligence/page.tsx` | Scraper status + today's greenlit feed + exec moves |
| `/buyers` | `app/buyers/page.tsx` | Searchable buyer directory table |
| `/buyers/[id]` | `app/buyers/[id]/page.tsx` | Buyer profile with 4-tab panel |
| `/pipeline` | `app/pipeline/page.tsx` | Kanban board with dnd-kit drag-drop + SWR polling |
| `/build` | `app/build/page.tsx` | 5-step package builder |
| `/build/[id]` | `app/build/[id]/page.tsx` | Existing package view/edit |
| `/shows` | `app/shows/page.tsx` | Show database with filters |
| `/shows/[id]` | `app/shows/[id]/page.tsx` | Show detail with linked buyer |
| `/pitch/[slug]` | `app/pitch/[slug]/page.tsx` | Buyer-facing pitch portal (light mode) |

### UI Components

All in `components/ui/`:

- `Nav.tsx` — left sidebar with active route detection
- `Card.tsx` — surface card, optional hoverable lift
- `Badge.tsx` — status/genre pill with 8 variants
- `StatusDot.tsx` — colored dot for buyer activity status
- `Skeleton.tsx` + `SkeletonCard` — shimmer loading states
- `Button.tsx` — primary / ghost / danger, renders as `<a>` with `href`
- `Input.tsx` — styled text input
- `Modal.tsx` — overlay with Escape + click-outside close

### Design System

Colors, fonts, and motion all via CSS variables defined in `app/globals.css`. Tailwind v4 arbitrary values (`bg-[var(--bg-surface)]`) used throughout. No hardcoded hex values in components.

- Display: Barlow Condensed 800
- UI: Inter
- Data/IDs: JetBrains Mono

### Key Data Flow

```
API Routes (/api/*)
  Server components fetch directly (no useEffect)
    Client islands handle search/filter/dnd
      SWR for polling data (pipeline: 5s, intelligence: 60s)
```

### Pipeline Kanban

`dnd-kit` drag-drop with optimistic UI updates. `PUT /api/pipeline/[id]/stage` on drop. SWR polls every 5s to catch Grok email auto-moves. Toast shows on error with exact message.

### Pitch Portal

`/pitch/[slug]` is buyer-facing — `data-theme="light"` switches to the light CSS variable overrides. Six scroll sections with a fixed bottom action bar. Font sizes go up to 96px for the hero title.
