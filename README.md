# The Action Gap

An interactive web app for an HHL Leipzig MBA Organizational Behavior session on climate change.

Three audience cohorts (Dolphins · Foxes · Elephants) participate live from their phones while a projector displays the unfolding cohort journey. Four rounds — **The Mirror**, **The Funnel**, **The Court**, **Reflection** — each surfacing a specific gap between what people believe, what they say, and what they do. The session ends with a screenshot-ready cohort poster and a per-cohort insights briefing.

## What it is

- **Phone**: `/phone/[cohort]` — join screen, then auto-routes through the four rounds as the facilitator advances them. URL never changes.
- **Projector poster**: `/poster/[cohort]` — full-screen state-aware view. Shows pre-session QR, live round content, walking-avatar trail, signature reveals, research-insight overlays, and a final locked artifact when the session ends.
- **Insights briefing**: `/insights/[cohort]` — editorial magazine spread of seven generated panels (gap, funnel, court, dragons, outlier, alignment, resilience) with click-through modal drill-downs.
- **Facilitator console**: `/control` — three-cohort dashboard with lifecycle controls (Start / End / Reset), round-jump buttons, reveal triggers, force-reveal modal, live roster, and links to all the projector / insight surfaces.
- **Dev tools**: `/dev/seed` — auto-play simulator for dry runs (gated to `NODE_ENV !== "production"`).

## Stack

- Next.js 16 (App Router, Turbopack dev)
- React 19, TypeScript
- Supabase (Postgres + Realtime channels with row-level realtime publication)
- Tailwind CSS 4
- framer-motion for round transitions, signature reveals, and modal animations
- DiceBear (lorelei) for participant avatars
- qrcode.react for join QR codes
- Playwright for browser-driven smoke tests

## Architecture

```
app/
  control/page.tsx              # facilitator dashboard, drives all 3 cohorts
  dev/seed/page.tsx             # session simulator (dev only)
  insights/[cohort]/page.tsx    # editorial briefing with modal drill-downs
  phone/[cohort]/page.tsx       # phone router — single durable URL
  phone/[cohort]/mirror/page.tsx
  poster/[cohort]/page.tsx      # main projector view
  presenter/[cohort]/{mirror,funnel,court,reflection}/page.tsx

components/
  Avatar.tsx                    # DiceBear-driven, deterministic per name
  TrailCanvas.tsx               # SVG curved path with 4 status-styled checkpoints
  ResearchInsight.tsx           # gold-tinted "DID YOU KNOW?" overlay card
  mascots/Mascot.tsx            # cohort-specific SVG silhouettes
  patterns/CohortPattern.tsx    # background pattern (sine waves / hatch / topo)
  signatures/Signature.tsx      # cohort-specific reveal flourish
  phones/{Mirror,Funnel,Court,Reflection}Phone.tsx
  posters/{Mirror,Funnel,Court,Reflection}Poster.tsx

lib/
  supabase.ts                   # browser client
  theme.ts                      # cohort design tokens (color, mascot, signature, voice)
  insights/generatePanels.ts    # pure 7-panel generator from raw responses
  useVisibilityRefetch.ts       # refetch hook for tab-switch recovery

scripts/
  setup-db.ts                   # idempotent schema + RLS + realtime setup
  full-test-run.ts              # DB-driven session simulator
  browser-test.ts               # Playwright walk-through (19 screenshots)
  test-generate-panels.ts       # panel-generator unit harness

supabase/
  schema.sql
  migrations/                   # incremental migrations 001 → 005
```

The poster page reads `current_round` and `reveal_state` from the `sessions` row, plus `participants` and `responses` for the active cohort, and renders a state-driven view that morphs as the facilitator advances rounds. All client components subscribe to Postgres realtime channels (with per-mount unique suffixes to avoid double-subscription on React strict-mode remounts).

## How to run locally

```bash
git clone <repo-url>
cd <repo>
npm install

cp .env.example .env.local
# fill in:
#   NEXT_PUBLIC_SUPABASE_URL=...
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
#   DATABASE_URL=postgresql://postgres.<ref>:<pw>@aws-1-<region>.pooler.supabase.com:5432/postgres

npx tsx scripts/setup-db.ts    # creates tables + indices + RLS + realtime publications
npm run dev
```

Open <http://localhost:3000>.

For a quick end-to-end demo without phones:
1. Open <http://localhost:3000/control>
2. Open <http://localhost:3000/poster/Dolphins> in another tab
3. Open <http://localhost:3000/dev/seed>, click 🚀 Auto-play full session under Dolphins
4. Watch the poster walk through Mirror → Funnel → Court → Reflection → Complete in ~10 seconds
5. Click View cohort insights on the final poster

## Tests

```bash
npx tsx scripts/test-generate-panels.ts   # panel generator unit harness
npx tsx scripts/full-test-run.ts          # DB-driven session simulation
npx tsx scripts/browser-test.ts           # Playwright walk-through (writes 19 screenshots/)
```

Browser tests require Playwright + Chromium installed:

```bash
npm install -D playwright
npx playwright install chromium
```

## License

MIT.
