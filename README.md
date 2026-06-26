# Drillin

An office-hookup app conducted entirely in deadpan LinkedIn / corporate-recruiting
vocabulary. The chrome is played 100% straight; the content underneath is not.

See [`docs/TECHNICAL_PLAN.md`](docs/TECHNICAL_PLAN.md) for architecture, the data
model, the permanence rules, and the milestone build order.

## Stack

- Next.js (App Router) + TypeScript, deployed on Vercel
- Supabase — Postgres + Auth + Realtime + RLS (schema in `supabase/migrations`)
- Drizzle ORM for the typed query surface (`src/lib/db/schema.ts`)
- Tailwind v4 for the corporate skin, framer-motion for the swipe feel

## Running locally

```bash
npm install
cp .env.example .env.local   # leave Supabase vars blank to use seed data
npm run dev                  # http://localhost:3000
```

With no Supabase project yet, the app runs against the in-memory seed fixtures
(`src/lib/data`), so the deck, profiles, and the public integrity ledger render
immediately. Set `DRILLIN_USE_SEED_DATA=1` to force seed mode even once
Supabase env is present.

### What's wired today (M0 + vertical slice)

- Corporate design system (`src/components/ui`) — the LinkedIn-blue skin
- Swipe deck with the recruiter filter bar + the do-nothing intent toggle
- Endorsement-only profiles with amber-self / blue-peer tag tiers
- The mutual-connection attribution leak on peer tags
- Public Profile Integrity ledger with 30-day behavioral framing
- Empty-state shame + "entirely self-endorsed" cope banner
- Double opt-in match screen
- Full DB schema + RLS + `SECURITY DEFINER` RPCs in `supabase/migrations/0001_init.sql`
  (the identity firewall — endorser identity never leaves the database)

The Supabase data layer drops in behind the async interface in `src/lib/data`.

## Deploy (Vercel)

Link the repo in the Vercel dashboard (New Project → import `tfpickard/drillin`).
Framework preset auto-detects Next.js; no build config needed.

**Environment variables** (Project → Settings → Environment Variables):

| Key | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` |
| `DRILLIN_USE_SEED_DATA` | `0` for live data, `1` to demo with fixtures |

The secret key is **not** needed at runtime — only `scripts/seed.ts` uses it,
which you run locally. Don't add it to Vercel.

**Supabase auth redirect URLs** (Supabase → Authentication → URL Configuration):
add your Vercel domain as the Site URL and to Redirect URLs, e.g.
`https://drillin.vercel.app/**`, so email confirmation / sign-in redirects
resolve. For local dev, `http://localhost:3000/**` is already implied.

Data pages are `force-dynamic`, so they render per-request against Supabase
rather than being cached at build time.
