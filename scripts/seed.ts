/**
 * Seeds a live Supabase project with the canon tag library and the deadpan
 * showcase profiles. Run locally — it needs the SECRET key, which bypasses RLS
 * and is required to create auth users for the fake profiles.
 *
 *   npm run db:seed
 *
 * Expects NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local.
 * Intended for a fresh project; re-running may error on already-created users.
 */
import { readFileSync } from "node:fs";
import { createAdminClient } from "../src/lib/supabase/admin";
import { CANON_TAGS } from "../src/lib/data/canon";

// ── env ──────────────────────────────────────────────────────────────────────
function loadEnvLocal() {
  try {
    const text = readFileSync(".env.local", "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const [, key, raw] = m;
      if (!key || raw === undefined || process.env[key]) continue;
      process.env[key] = raw.replace(/^["']|["']$/g, "");
    }
  } catch {
    // rely on the ambient environment
  }
}
loadEnvLocal();

const db = createAdminClient();
const categoryOf = new Map(CANON_TAGS.map((t) => [t.label, t.category]));

// ── showcase spec ────────────────────────────────────────────────────────────
type PeerTag = [label: string, count: number];

interface Spec {
  slug: string;
  name: string;
  role: string;
  company: string;
  campus: string;
  location: string;
  seniority: string;
  headline: string;
  availability: "actively_looking" | "open_to_opportunities";
  intent: string;
  intentLine: string;
  hue: number;
  peer: PeerTag[];
  self: string[];
  hiddenPeer?: PeerTag[]; // counted in "ever" but not "active" → dents retention
  events?: { hidden?: number; declined?: number };
}

const SPECS: Spec[] = [
  {
    slug: "priya", name: "Priya Raghavan", role: "Engagement Manager",
    company: "McKinsey & Company", campus: "Chicago — Loop", location: "Greater Chicago Area",
    seniority: "principal", headline: "I'd love to grab 30 minutes to align on next steps.",
    availability: "open_to_opportunities", intent: "synergy",
    intentLine: "Looking to build durable, high-trust working relationships.", hue: 268,
    peer: [["Stakeholder Alignment", 6], ["Owns The Room", 5], ["Executive Presence", 4], ["Reads The Room", 3]],
    self: ["Strategic Roadmapping"],
  },
  {
    slug: "brad", name: "Brad Sorensen", role: "Growth Lead",
    company: "Oracle", campus: "Austin — Parmer", location: "Austin, Texas",
    seniority: "senior", headline: "Operator. Closer. Still figuring out who I am at 6pm.",
    availability: "actively_looking", intent: "disruption",
    intentLine: "Open to disruptive 1:1 collaboration with the right stakeholder.", hue: 18,
    peer: [], self: ["Rainmaker", "Quota Crusher", "Forearms", "Owns The Room", "V-Taper"],
  },
  {
    slug: "marcus", name: "Marcus Bell", role: "Principal Engineer",
    company: "Stripe", campus: "South San Francisco", location: "San Francisco Bay Area",
    seniority: "principal", headline: "Mostly heads-down. Open to a quick sync.",
    availability: "open_to_opportunities", intent: "mentorship",
    intentLine: "Happy to mentor. Happy to be mentored. Happy.", hue: 158,
    peer: [["Forearms", 7], ["Calm Under Pressure", 6], ["Jawline", 5], ["Holds Eye Contact", 4], ["Subject Matter Expert", 3]],
    self: [],
  },
  {
    slug: "dana", name: "Dana Whitfield", role: "Director of Product",
    company: "Salesforce", campus: "San Francisco — Tower", location: "San Francisco Bay Area",
    seniority: "director", headline: "Building thoughtful products with thoughtful people.",
    availability: "open_to_opportunities", intent: "networking",
    intentLine: "Expanding my network of high-caliber collaborators.", hue: 322,
    peer: [["Strategic Roadmapping", 5], ["Diplomatic", 3]],
    self: ["Customer-Obsessed", "Detail-Oriented"],
    hiddenPeer: [["Pings After Hours", 2]],
    events: { hidden: 3, declined: 2 },
  },
  {
    slug: "tobias", name: "Tobias Penn", role: "VP, Strategic Partnerships",
    company: "Google", campus: "Boulder", location: "Boulder, Colorado",
    seniority: "vp", headline: "Let's drill into this offline. My calendar is wide open.",
    availability: "actively_looking", intent: "one_on_one_sync",
    intentLine: "Seeking aggressive 1:1 alignment. Will travel for the right synergy.", hue: 4,
    peer: [["Forearms", 8], ["Grip", 7], ["Commanding Height", 6], ["Owns The Room", 6], ["Pings After Hours", 5], ["Fills Out A Blazer", 4]],
    self: [],
  },
  {
    slug: "wen", name: "Wen Li", role: "Associate Consultant",
    company: "Bain & Company", campus: "Boston — Hancock", location: "Greater Boston",
    seniority: "associate", headline: "New to the team. Eager to add value.",
    availability: "open_to_opportunities", intent: "networking",
    intentLine: "Looking to learn from senior individual contributors.", hue: 205,
    peer: [["Replies Fast", 1]], self: [],
  },
];

const BOT_COUNT = 12;

// ── helpers ──────────────────────────────────────────────────────────────────
async function createUser(email: string, name: string): Promise<string> {
  const { data, error } = await db.auth.admin.createUser({
    email,
    password: `Seed!${Math.abs(hash(email))}aA`,
    email_confirm: true,
    user_metadata: { seed: true, name },
  });
  if (error || !data.user) throw new Error(`createUser ${email}: ${error?.message}`);
  return data.user.id;
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

async function upsertNamed(table: "companies" | "roles", names: string[]) {
  const rows = [...new Set(names)].map((name) => ({ name }));
  const { error } = await db.from(table).upsert(rows, { onConflict: "name" });
  if (error) throw error;
  const { data } = await db.from(table).select("id,name");
  return new Map((data ?? []).map((r) => [r.name, r.id]));
}

async function canonIdMap() {
  const labels = CANON_TAGS.map((t) => ({ label: t.label, category: t.category }));
  // chunked upsert to stay under payload limits
  for (let i = 0; i < labels.length; i += 200) {
    const { error } = await db
      .from("canon_tags")
      .upsert(labels.slice(i, i + 200), { onConflict: "label" });
    if (error) throw error;
  }
  const { data } = await db.from("canon_tags").select("id,label");
  return new Map((data ?? []).map((r) => [r.label, r.id]));
}

// ── main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("Seeding canon tags…");
  const canon = await canonIdMap();
  console.log(`  ${canon.size} canon tags`);

  const companyMap = await upsertNamed("companies", SPECS.map((s) => s.company));
  const roleMap = await upsertNamed("roles", SPECS.map((s) => s.role));

  console.log(`Creating ${BOT_COUNT} endorser bots…`);
  const bots: string[] = [];
  for (let i = 0; i < BOT_COUNT; i++) {
    bots.push(await createUser(`seed.bot${i}@drillin.app`, `Endorser ${i}`));
  }

  console.log(`Creating ${SPECS.length} showcase profiles…`);
  const idBySlug = new Map<string, string>();
  for (const s of SPECS) {
    const id = await createUser(`seed.${s.slug}@drillin.app`, s.name);
    idBySlug.set(s.slug, id);
    const { error } = await db.from("profiles").upsert({
      id,
      display_name: s.name,
      role_id: roleMap.get(s.role),
      company_id: companyMap.get(s.company),
      campus: s.campus,
      location: s.location,
      seniority: s.seniority,
      headline: s.headline,
      availability: s.availability,
      intent: s.intent,
      intent_line: s.intentLine,
      avatar_hue: s.hue,
      is_age_verified: true,
      consents_to_listing: true,
    });
    if (error) throw error;
  }

  console.log("Inserting endorsements…");
  const rows: Record<string, unknown>[] = [];
  const events: Record<string, unknown>[] = [];

  for (const s of SPECS) {
    const subjectId = idBySlug.get(s.slug)!;

    for (const [label, count] of s.peer) {
      for (let i = 0; i < count; i++) {
        rows.push(endorsement(subjectId, bots[i % BOT_COUNT]!, label, "peer", "active", canon));
      }
    }
    for (const [label, count] of s.hiddenPeer ?? []) {
      for (let i = 0; i < count; i++) {
        rows.push(endorsement(subjectId, bots[i % BOT_COUNT]!, label, "peer", "hidden", canon));
      }
    }
    for (const label of s.self) {
      rows.push(endorsement(subjectId, subjectId, label, "self", "active", canon));
    }
    for (let i = 0; i < (s.events?.hidden ?? 0); i++) {
      events.push({ subject_id: subjectId, type: "hidden" });
    }
    for (let i = 0; i < (s.events?.declined ?? 0); i++) {
      events.push({ subject_id: subjectId, type: "declined" });
    }
  }

  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await db.from("endorsements").insert(rows.slice(i, i + 500));
    if (error) throw error;
  }
  if (events.length) {
    const { error } = await db.from("integrity_events").insert(events);
    if (error) throw error;
  }

  // A connection so the graph is non-empty (mutual leak lights up under auth).
  const a = idBySlug.get("priya")!;
  const b = idBySlug.get("marcus")!;
  const [ua, ub] = a < b ? [a, b] : [b, a];
  const { data: match } = await db
    .from("matches")
    .insert({ user_a: ua, user_b: ub })
    .select("id")
    .single();
  if (match) await db.from("conversations").insert({ match_id: match.id });

  console.log(`Done. ${rows.length} endorsements, ${events.length} integrity events.`);
}

function endorsement(
  subjectId: string,
  endorserId: string,
  label: string,
  tier: "self" | "peer",
  status: "active" | "hidden",
  canon: Map<string, string>,
) {
  const canonId = canon.get(label);
  if (!canonId) throw new Error(`canon tag not found: ${label}`);
  return {
    subject_id: subjectId,
    endorser_id: endorserId,
    tier,
    kind: "canon",
    canon_tag_id: canonId,
    status,
    category: categoryOf.get(label) ?? "corporate",
  };
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
