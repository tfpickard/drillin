# Drillin — Technical Plan (Planning Pass)

## Context

Drillin is an office-hookup app whose entire UX is conducted in deadpan LinkedIn / corporate-recruiting vocabulary. The comedy is register whiplash: sincere HR chrome over feral content, played 100% straight. The product thesis is "a dashboard for your dignity" — neutral-looking metrics that happen to be devastating, with enough deniability that you're never sure.

This document is a **plan to argue with, not code to ship.** Repo is greenfield (empty Next.js target). It proposes architecture, a data model (with special care for the tag-permanence rules, the event-sourced public ledger, and the mutual-connection attribution query), an MVP cut, a milestone build order, the decisions still owed, and ranked risks. No app code is written yet.

The non-negotiable engineering constraint underneath the jokes: **the premise is a harassment vector by design, so consent mechanics are first-class product, not an afterthought.** Every permanence/visibility rule below is also a safety rule.

---

## 1. Proposed Architecture

### Recommended stack
- **Next.js (App Router) + TypeScript on Vercel.** Server Components for reads (deck, profile, ledger); Server Actions / Route Handlers for mutations (swipe, endorse, hide, approve/decline, report, block). Mobile-first.
- **Supabase as the single backend** — Postgres + Auth + Realtime + Storage + Row-Level Security, one vendor. *Argued below vs. Neon+Clerk+Ably.*
- **Drizzle ORM** for typed schema and app queries; **plain SQL migrations** (Supabase migration files) as source of truth for RLS policies, `SECURITY DEFINER` RPC functions, views, enums, and seed data. Drizzle for the typed 80%; raw SQL for the privacy/ledger 20% that an ORM models badly.
- **Tailwind + a small design-system layer** for the "LinkedIn-blue" sterile corporate skin (tokens, card, pill, ledger panel, tag chips). The skin is load-bearing comedy — treat it as a real component library, not ad-hoc classes.
- **framer-motion** for swipe drag gestures. Web MVP, not native. *Argued below.*
- **pgvector** extension enabled but unused at MVP — the seam for embedding-ranked deck later.

### Why Supabase over Neon + Clerk + Ably
The brief's two hard constraints — "don't hand-roll websockets" and "plan consent as first-class" — both point at Supabase:
- **Realtime** ships free with the DB (Postgres replication → channel subscriptions for chat). Neon needs a bolt-on (Ably/Pusher) and a second auth integration.
- **RLS is the safety story.** Consent gates (nothing free-form public until approved; endorser identity never leaves the DB) are enforced at the row level in the database, not just in app code that can be bypassed. This is the single biggest argument. With Neon you'd reimplement this in app middleware and pray.
- One vendor, one JWT, less glue for an MVP whose job is to prove a joke.
- Cost of choosing Supabase: vendor lock-in on Auth + Realtime, and RLS policies are real work to get right. Acceptable. Neon's branching DX and Clerk's prebuilt UI are nice-to-haves we're trading away knowingly.

### Data-flow sketch
```
Browser (RSC + framer-motion)
  ├─ reads ──────────────► Next server (RSC) ──► Supabase Postgres (RLS-scoped)
  ├─ mutations ──────────► Server Actions ─────► Supabase RPC (SECURITY DEFINER for
  │                                              privileged aggregates / rate limits)
  └─ chat live updates ──► Supabase Realtime channel (messages, RLS-scoped to match)
Avatars ──► Supabase Storage (signed URLs)
```
**Identity firewall:** `endorsements.endorser_id` is *never* selectable by clients (RLS denies it outright). Every number that touches a peer tag — total count, "incl. N mutual connections" — is returned by a `SECURITY DEFINER` function that reads endorser identity internally and emits only integers. The paranoia is the product; the privacy is enforced in Postgres.

---

## 2. Data Model

Postgres. Enums for closed vocabularies; `SECURITY DEFINER` RPCs + a view for derived metrics.

### Core identity & sourcing taxonomy
- **`profiles`** (1:1 `auth.users`): `id`, `display_name`, `role_id`, `company_id`, `campus_id`, `location` (self-reported metro/region, **LinkedIn-style — this is the proximity signal, not GPS**), `seniority`, `headline`, `availability` (enum: `actively_looking`, `open_to_opportunities`), `intent` (enum: `networking|synergy|mentorship|disruption|one_on_one_sync` — **stored for vanity, routes to nothing**), `is_age_verified` (bool, stub), `consents_to_listing` (bool), `created_at`.
- **`companies`**, **`roles`** — normalized so Company and Role filter cleanly (autocomplete-backed, free-add allowed). **`seniority`** is an enum.
- **Campus is self-reported, best-effort** — a free text field on `profiles` (with autocomplete over whatever values already exist), **not** a verified/authoritative table. We will never get real campus buy-in, so we don't pretend to: it's a sourcing *filter facet* (the "Google Boulder campus" joke survives) but it's an unverified string, never a distance or trust signal.

**Proximity = LinkedIn's model, decided.** No GPS, no lat/lng distance. The card's "distance" slot becomes **connection-degree** (1st / 2nd / 3rd connection) plus the self-reported `location` string. Degree is computed from the `matches` graph (§ Social graph) — a 2nd-degree connection is someone you share a match with. This rides the exact graph that powers the mutual-connection attribution leak, so the paranoia mechanic and the proximity mechanic are the same query, and "2nd connection" on a card is itself a faint, obsess-able signal.

### Tags
- **`canon_tags`**: `id`, `label`, `category` (enum: `corporate|physical|behavioral`), `search` (tsvector or trigram index). ~1000 rows, seeded. Autocomplete = trigram/`pg_trgm` ILIKE or FTS prefix search.
- **`endorsements`** — the heart. Columns:
  - `id`, `subject_id` (who it's about), `endorser_id` (**server-only, RLS-hidden**),
  - `tier` (enum: `self|peer`), `kind` (enum: `canon|freeform`),
  - `canon_tag_id` (nullable FK) **or** `freeform_label` (nullable text) — exactly one set,
  - `status` (enum: `pending|active|hidden|declined`),
  - `category` (denormalized from canon, or `freeform`) — drives the physical-consent branch,
  - `created_at`, `decided_at`.

### Permanence state machine (the trap, encoded)
The master rule: **total control over self-narration, near-zero control over reputation.**

| tier · kind · category | enters as | recipient can | leaves a ghost? |
|---|---|---|---|
| self · canon or freeform (any) | `active` | hard-delete freely | **no** |
| peer · canon · corporate/behavioral/**physical** | `active` (public immediately) | **hide only** | **yes** → `hidden` event |
| peer · freeform (any) | `pending` (typed-out friction) | approve → clean-deletable / decline | approve→no ghost; **decline → `declined` event** |

**The canon list is the safety boundary for physical tags.** Canon physical tags are physical-but-*not-sexual* by curation (Forearms, Jawline, Posture, Voice, Grip) — risqué and objectifying-lite, which is the *point*: there has to be real risk or it isn't fun. So they behave like all canon — public immediately, hide-only, on the record. Anything genuinely explicit can only arrive as **free-form**, which is gated behind typed-out friction + subject approval and is never public until approved. The line isn't "physical vs. not"; it's "we curated this word vs. you invented it." That keeps the edge while keeping the worst out of the public surface without consent.

- Self-delete = row removed, no event. Peer-canon hide = `status→hidden` + integrity event. Freeform approve = `status→active`, later delete is clean (recipient already consented). Freeform/physical decline = `status→declined` + integrity event; never public.
- Constraint: a row's allowed transitions are enforced in the mutation RPC (and re-asserted by RLS `WITH CHECK`), not trusted from the client.

### Event-sourced ledger (hides/declines are events, not counters)
- **`integrity_events`**: `id`, `subject_id`, `endorsement_id`, `type` (enum: `hidden|declined|approved|peer_received|peer_lost`), `occurred_at`. Append-only.
- **Public ledger** = a `profile_integrity` **view / RPC** computed over `integrity_events` on a rolling window:
  - *Endorsements hidden (30d)* = `count(type=hidden, occurred_at > now()-30d)`
  - *Endorsements declined (30d)* = `count(type=declined, …)`
  - *Self-endorsement ratio* = active self / active total, with severity label (`nominal <0.34 / elevated / high >0.66` — thresholds tunable)
  - *Peer retention* = active peer / ever-received peer (window-bounded)
- **Copy bias: behavioral over state.** "Hid 3 endorsements **last month**" (implies a habit) beats "3 hidden" (implies a one-off). The event+window model is what makes the temporal framing truthful and cheap. The ledger is **public on every card** — scrubbing is itself a public metric. The prison locks from the outside.
- Perf: a plain view recomputed on read is fine at MVP scale. Seam for a materialized view + cron refresh later.

### Social graph & attribution leak
- **`swipes`**: `swiper_id`, `target_id`, `direction` (enum `right|left`), `created_at`. Unique on (swiper, target).
- **`matches`** (= **connections**, one concept): `user_a`, `user_b` (sorted pair, unique), `created_at`. Created when both swipe `right`. This *is* the social graph used for mutual-connection attribution.
- **Attribution leak** — `Groin · 4, incl. 1 mutual connection`. A `SECURITY DEFINER` RPC:
  `peer_tag_attribution(subject, viewer) → { tag, total, mutual_count }`
  computes `| endorsers(subject, tag) ∩ connections(viewer) |` internally and returns **only the integer**. Endorser ids never cross the DB boundary. One mutual is the perfect dose; we never reveal which. The query is an intersection count over `endorsements.endorser_id` (hidden) and `matches`.

### Messaging
- **`conversations`** (1:1 per match) and **`messages`** (`conversation_id`, `sender_id`, `body`, `created_at`). RLS: only the two match participants read/write. Realtime channel filtered by `conversation_id`.

### Safety
- **`blocks`** (`blocker_id`, `blocked_id`): excluded from deck, attribution, and match — both directions.
- **`reports`** (`reporter_id`, `subject_id`, `reason`, `target_kind` + `target_id` for profile/endorsement/message, `status`). Admin review stubbed (a protected internal route in MVP).
- **Endorse rate-limiting** (anti-pile-on / anti-brigade): enforced inside the endorse RPC — per-endorser daily cap, per-(endorser→subject) cooldown, per-subject inbound burst cap. Postgres-side counts at MVP; Upstash/edge layer later.

---

## 3. MVP Build Order (each milestone independently demoable)

- **M0 — Foundation.** Next.js+TS scaffold, Tailwind + corporate design-system primitives (card, pill, tag chip, ledger panel), Supabase project, Drizzle + SQL migration pipeline, pgvector enabled, CI, Vercel deploy. *Demo: deployed app with a login screen and the LinkedIn-blue skin.*
- **M1 — Auth + onboarding.** Supabase Auth; profile creation (role, company, campus, seniority, headline, availability, the do-nothing intent toggle, 18+/consent-to-be-listed stub). *Demo: sign up → onboard → view your own blank profile with empty-state shame: "No endorsements yet. Nobody's vouched for you."*
- **M2 — Endorsement-only profiles + canon tags.** Seeded `canon_tags` + autocomplete; create self/peer canon endorsements; amber-self (`· you`) vs blue-peer rendering; empty-state + "Entirely self-endorsed. Reads as cope." banner. *Demo: endorse self + a seed profile; see tiers and shame banners.*
- **M3 — Permanence + friction + approval + public ledger.** Hide (peer canon → event); free-form typed-out gate → pending → approve(clean-deletable)/decline(event); self clean-delete; physical-canon consent branch (Decision #1); public Profile Integrity ledger with 30d behavioral framing. *Demo: walk the full permanence trap; watch the public ledger price in your scrubbing.*
- **M4 — Deck + filters + match.** framer-motion swipe (drag + buttons); recruiter filter bar (Company/Role/Campus/Seniority); intent toggle that routes nowhere; dumb ranking RPC (filter + proximity + randomize, `ORDER BY` seam for pgvector); swipe persistence; double-opt-in match screen ("Mutual Connection / It's a Match / take this conversation offline"). *Demo: swipe the seed deck, get a match.*
- **M5 — Chat + attribution leak + safety.** Realtime post-match chat; mutual-connection attribution count on peer tags; report + block; endorse rate-limiting. *Demo: match→chat; "incl. 1 mutual connection"; block/report works.*
- **M6 — Cold-start seed.** Deadpan fake-profile seed set spanning the full range — from pure-restraint ("I'd love to grab 30 minutes to align on next steps") to all-the-way-off-the-leash — so the deck isn't a ghost town and the contrast engine is visible day one. *Demo: fresh deck full of restraint-vs-feral cards.*

Safety is **woven**, not a milestone: consent stub (M1), consent gate + permanence (M3), report/block/rate-limit (M5).

### Explicitly later (seams left)
Embedding-ranked deck (pgvector + UMAP prior art), video, realtime presence, fuller analytics surface, native app, real LinkedIn-style verification.

---

## 4. Decisions

### Resolved this pass
- **Platform:** Web (Next.js + framer-motion). ✅
- **Proximity:** LinkedIn's model — self-reported `location` + connection-degree from the match graph; **no GPS, campus demoted to a filter facet.** ✅ (See §2.)
- **Physical-tag consent:** no pending gate for canon physical. The curated canon is non-sexual by construction and carries real, intended risk (public + hide-only like all canon). Explicit content is confined to the free-form approval gate. ✅
- **Campus:** self-reported, best-effort, unverified string; filter facet only. ✅
- **Canon tag list:** working seed generated (Appendix A), expandable to the full ~1000 at M2. ✅

### Defaulted to recommendation (overridable)
- **Backend → Supabase all-in.** RLS enforces the consent gates and endorser-identity firewall at the row level; Realtime ships with the DB. The plan is written against this; switching to Neon+Clerk+Ably means reimplementing the safety story in app code.

### Smaller calls made (flag if you disagree)
- **Role/Seniority:** Role autocomplete-with-free-add; Seniority a fixed enum (the filter bar must actually filter).
- **Self free-form tags:** no approval needed (it's about yourself; self-narration edits freely, no trace).
- **Age/identity verification:** hard-stub in MVP (18+ checkbox + consent-to-be-listed bool), real provider before any public launch.

### Still genuinely open (not blocking phase 1)
- **Launch wedge:** which single city seeds the cold start (drives the M6 seed set's flavor).
- **Canon list final size/curation:** Appendix A is the working seed; hand-curate before topping up to 1000, or generate-then-prune?

---

## 5. Risks (ranked)

1. **Safety / harassment (product-existential).** Real identifiable people described sexually. Mitigations are core product: approval gate for everything non-consensual, physical-consent branch (#1), report/block day one, rate-limits, age/listing consent. If this isn't airtight the app is indefensible, funny or not. **Highest.**
2. **The joke dies if the deadpan breaks.** No winking, no emoji, no "we're in on it." A single jokey string collapses the register. Mitigation: copy is a reviewed asset; the design system enforces flat analytics voice.
3. **Cold-start two-sided market.** Empty deck = dead app. Mitigation: single-wedge launch (one campus/city) + the M6 seed set that itself demonstrates the comedic range.
4. **RLS / identity-firewall correctness.** A leak of `endorser_id` (who tagged you "Groin") is both a privacy breach and kills the paranoia mechanic. Mitigation: endorser id never client-selectable; all aggregates via `SECURITY DEFINER` RPC; test the firewall explicitly.
5. **Ledger semantics / perf.** Event-sourced rolling-window metrics must be correct (habit framing depends on it) and cheap. Mitigation: view at MVP, materialized + cron seam.
6. **Platform / ToS risk.** App stores and payment rails are hostile to sexual-content apps; Vercel/Supabase AUPs apply. Mitigation: know the lines before marketing spend; web-first sidesteps app-store review for the MVP.
7. **Swipe feel on web.** "Load-bearing" per the brief; web drag can feel worse than native. Mitigation: invest in framer-motion gesture tuning in M4; reassess native only if it genuinely fails to land.

---

## 6. Verification (how we'll prove each milestone)
- **Per-milestone demo** as listed in §3 — each is a clickable end-to-end slice.
- **Identity-firewall test (M3/M5):** automated check that no client query path can return `endorser_id`; attribution RPC returns only integers.
- **Permanence matrix tests (M3):** assert each cell of the §2 table — self deletes leave no event; peer-canon hide writes exactly one `hidden` event; freeform decline writes one `declined` event and never goes public.
- **Ledger window tests (M3):** events aging past 30d drop out of public counts; severity thresholds map correctly.
- **Safety tests (M5):** blocked users vanish from deck/attribution/match both ways; rate-limit caps reject brigading; report lands in the queue.
- **Seed-range review (M6):** eyeball the deck — a pure-restraint card sits next to a feral one; the contrast reads.

---

## Appendix A — Canon Tag Library (working seed)

The schema is `canon_tags(id, label, category, search)`; `category ∈ {corporate, physical, behavioral}`. Physical is **non-sexual by curation** — that's the safety boundary (§2). This is the voice-locking seed, not the final 1000; we top up in-voice at M2. Better 300 razor-sharp than 1000 padded.

### corporate (~110)
Stakeholder Alignment · Strategic Roadmapping · Cross-Functional Synergy · Thought Leadership · Executive Presence · Manages Up · Manages Down · Skip-Level Ready · Calibration-Proof · Promotable · Stack-Ranked · Quota Crusher · Pipeline Builder · Always Be Closing · Rainmaker · Trusted Advisor · Subject Matter Expert · Domain Expert · Go-To Person · Force Multiplier · Self-Starter · Results-Oriented · Detail-Oriented · Big-Picture Thinker · Roadmap Owner · Consensus Builder · Influence Without Authority · Servant Leader · Visionary · Execution Machine · Player-Coach · Glue Work · Air Cover · Source Of Truth · Single Pane Of Glass · North Star · North-Star Metric · OKR Whisperer · KPI-Driven · Data-Driven · Customer-Obsessed · First-Principles Thinker · 10x Contributor · Value-Add · Core Competency · Best-In-Class · Quick Win · Low-Hanging Fruit · Moves The Needle · Boils The Ocean · Runs It Up The Flagpole · Takes It Offline · Drills Down · Deep Diver · Level-Setter · Socializes The Deck · Ideates · Operationalizes · Streamlines · Right-Sizes · Blue-Sky Thinker · Paradigm Shifter · Bandwidth-Rich · Circles Back · Parking-Lot Parker · Touches Base · Loops You In · Pings Thoughtfully · Syncs Up · Pre-Reads · Post-Mortems · Retro-Ready · Sprint-Hardened · High Velocity · Backlog Groomer · Definition-Of-Done Stickler · MVP Shipper · Force Of Nature · Wrangles Stakeholders · Owns The Outcome · Drives Consensus · Unblocks Others · Raises The Bar · Bar-Raiser · Disagrees And Commits · Has The Receipts · Reads The Tea Leaves · Boardroom-Ready · C-Suite Adjacent · Investor-Update Author · All-Hands Speaker · Town-Hall Closer · Keynote Energy · Slide-Deck Auteur · Spreadsheet Wizard · Dashboard Builder · Metric Mover · Synergy Realizer · Value Capturer · Margin Defender · Burn-Rate Aware · Runway Extender · Headcount Justifier · Reorg Survivor · Layoff-Proof · Vested · Fully Diluted · Equity-Pilled · Liquidity-Event Ready

### physical — non-sexual (~80)
Forearms · Jawline · Posture · Voice · Grip · Handshake · Shoulders · Broad Shoulders · Collarbone · Neck · Traps · Biceps · Triceps · Wrists · Knuckles · Hands · Veins · Vascularity · Frame · Build · Proportions · V-Taper · Narrow Waist · Calves · Forearm Veins · Stubble · Five O'Clock Shadow · Beard · Beard Density · Salt-And-Pepper · Hairline · Widow's Peak · The Hair · Cheekbones · Bone Structure · Side Profile · Profile · Silhouette · Complexion · Tan · Freckles · Dimples · Smile · Teeth · The Glasses · Brow · Eye Contact · Lashes · Sideburns · Chin · Gait · Stride · Presence · Height · Stands Up Straight · Good Frame · Strong Jaw · Defined · Lean · Built · The Watch · Cufflink Energy · Rolled Sleeves · Forearm Reveal · Tailored Fit · Fills Out A Blazer · Lanyard · Badge Flex · Standing Desk Posture · Walks With Purpose · Firm Handshake · Holds A Room Physically · Commanding Height · Gym-At-Lunch · Marathon Calves · Climber's Forearms · Cyclist's Quads · Swimmer's Shoulders · Desk-Job Slump (cope) · Hunches At Standup

### behavioral (~110)
Replies Fast · Replies Never · Left During Standup · Owns The Room · Reply-All Offender · Talks Over People · Mutes Aggressively · Camera Always Off · Camera Always On · Green Dot At Midnight · Weekend Emailer · Last To Leave The Call · First To Drop · Schedules 8am Syncs · Declines Every Meeting · Double-Books · Calendar Tetris · Reads The Room · Misreads The Room · Circles Back (Eventually) · Never Circles Back · Takes It Offline (Literally) · Ghosts Threads · Thread Necromancer · Passive-Aggressive In Slack · Emoji-Only Replies · The Thumbs-Up Of Death · Heavy Sigher · Closes Your Tickets · Reopens Your Tickets · Bikeshedder · Decisive · Chronically Indecisive · Holds Eye Contact · Avoids Eye Contact · Walk-And-Talker · Whiteboard Hog · Steals Credit · Gives Credit Generously · Throws You Under The Bus · Covers For You · Volunteers First · Never Volunteers · Over-Prepares · Wings It Beautifully · Death By PowerPoint · 'One More Thing' · Runs Over Time · Ends Meetings Early · Hard Stop At 5 · Always 'In A Meeting' · Inbox Zero · Inbox Bankruptcy · Strong Opinions, Loosely Held · Strong Opinions, Tightly Held · Professional Devil's Advocate · Relentlessly Yes-And · Hard No · Diplomatic · Brutally Blunt · Takes The Notes · Closes The Action Items · Follows Up · Drops The Ball · Reliable · Flaky · Punctual · Fashionably Late To Standup · Joins Two Minutes Early · Fills Awkward Silences · Comfortable With Silence · Good In A Crisis · Panics Quietly · Calm Under Pressure · Escalates Immediately · De-escalates · Mentors Quietly · Gatekeeps · Open-Door · Slack-Status Poet · Status: Deep Work · 'Touching Base' · Pings After Hours · OOO Respecter · Ignores OOO · Books Over Lunch · Eats At Desk · Coffee Walk Inviter · Lingers After The Meeting · Finds You In The Kitchen · Lingers By Your Desk · Slides Into The DMs (Professionally) · Adds You On LinkedIn First · Endorses Back Immediately · Endorses Strategically · Endorses And Runs · Never Endorses Back · Read Receipt On, Replies Off · Types… Then Stops · Voice-Memo Sender · Calendar-Invite Flirt · 'Quick Sync?' At 6pm · Reschedules Thrice · Confirms Twice · Down To Align · Aligns Offline · Takes This Conversation Offline
