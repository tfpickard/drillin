import type { IntegrityLedger, Profile, ProfileTag } from "@/lib/types";
import { severityFromRatio } from "@/lib/ledger";

/**
 * Cold-start seed (spec §"Cold start"). The set must demonstrate the full
 * comedic range — pure restraint sitting next to all-the-way-off-the-leash —
 * because the contrast is the engine. Every card is played 100% straight.
 */

function ledger(
  tags: ProfileTag[],
  opts: { hidden30d?: number; declined30d?: number; peerRetention?: number } = {},
): IntegrityLedger {
  const active = tags.filter((t) => !t.pending);
  const self = active.filter((t) => t.tier === "self").length;
  const total = active.length;
  const ratio = total === 0 ? 0 : self / total;
  return {
    hidden30d: opts.hidden30d ?? 0,
    declined30d: opts.declined30d ?? 0,
    selfRatio: ratio,
    selfRatioSeverity: severityFromRatio(ratio),
    peerRetention: opts.peerRetention ?? 1,
  };
}

const self = (label: string, category: ProfileTag["category"]): ProfileTag => ({
  label,
  tier: "self",
  category,
  count: 1,
  mutual: 0,
});

const peer = (
  label: string,
  category: ProfileTag["category"],
  count: number,
  mutual = 0,
): ProfileTag => ({ label, tier: "peer", category, count, mutual });

interface SeedInput extends Omit<Profile, "ledger"> {
  ledger?: Partial<{ hidden30d: number; declined30d: number; peerRetention: number }>;
}

function profile(p: SeedInput): Profile {
  return { ...p, ledger: ledger(p.tags, p.ledger ?? {}) };
}

export const SEED_PROFILES: Profile[] = [
  // 1 — Pure restraint. Zero horny content. The control sample.
  profile({
    id: "p_priya",
    displayName: "Priya Raghavan",
    role: "Engagement Manager",
    company: "McKinsey & Company",
    campus: "Chicago — Loop",
    location: "Greater Chicago Area",
    seniority: "principal",
    headline: "I'd love to grab 30 minutes to align on next steps.",
    availability: "open_to_opportunities",
    intent: "synergy",
    intentLine: "Looking to build durable, high-trust working relationships.",
    avatarHue: 268,
    degree: 2,
    tags: [
      peer("Stakeholder Alignment", "corporate", 9, 1),
      peer("Owns The Room", "behavioral", 6),
      peer("Executive Presence", "corporate", 5),
      peer("Reads The Room", "behavioral", 4),
      self("Strategic Roadmapping", "corporate"),
    ],
    ledger: { peerRetention: 1 },
  }),

  // 2 — Entirely self-endorsed. Triggers the cope banner.
  profile({
    id: "p_brad",
    displayName: "Brad Sorensen",
    role: "Growth Lead",
    company: "Oracle",
    campus: "Austin — Parmer",
    location: "Austin, Texas",
    seniority: "senior",
    headline: "Operator. Closer. Still figuring out who I am at 6pm.",
    availability: "actively_looking",
    intent: "disruption",
    intentLine: "Open to disruptive 1:1 collaboration with the right stakeholder.",
    avatarHue: 18,
    degree: 3,
    tags: [
      self("Rainmaker", "corporate"),
      self("Quota Crusher", "corporate"),
      self("Forearms", "physical"),
      self("Owns The Room", "behavioral"),
      self("V-Taper", "physical"),
    ],
  }),

  // 3 — Heavily peer-endorsed. The mutual-connection leak does its work.
  profile({
    id: "p_marcus",
    displayName: "Marcus Bell",
    role: "Principal Engineer",
    company: "Stripe",
    campus: "South San Francisco",
    location: "San Francisco Bay Area",
    seniority: "principal",
    headline: "Mostly heads-down. Open to a quick sync.",
    availability: "open_to_opportunities",
    intent: "mentorship",
    intentLine: "Happy to mentor. Happy to be mentored. Happy.",
    avatarHue: 158,
    degree: 1,
    tags: [
      peer("Forearms", "physical", 7, 1),
      peer("Calm Under Pressure", "behavioral", 6),
      peer("Jawline", "physical", 5),
      peer("Holds Eye Contact", "behavioral", 4, 1),
      peer("Subject Matter Expert", "corporate", 3),
    ],
    ledger: { peerRetention: 0.92 },
  }),

  // 4 — The scrubber. Public ledger prices in the habit.
  profile({
    id: "p_dana",
    displayName: "Dana Whitfield",
    role: "Director of Product",
    company: "Salesforce",
    campus: "San Francisco — Tower",
    location: "San Francisco Bay Area",
    seniority: "director",
    headline: "Building thoughtful products with thoughtful people.",
    availability: "open_to_opportunities",
    intent: "networking",
    intentLine: "Expanding my network of high-caliber collaborators.",
    avatarHue: 322,
    degree: 2,
    tags: [
      peer("Strategic Roadmapping", "corporate", 5),
      peer("Diplomatic", "behavioral", 3, 1),
      self("Customer-Obsessed", "corporate"),
      self("Detail-Oriented", "corporate"),
    ],
    ledger: { hidden30d: 3, declined30d: 2, peerRetention: 0.58 },
  }),

  // 5 — All the way off the leash, delivered in pure HR voice.
  profile({
    id: "p_tobias",
    displayName: "Tobias Penn",
    role: "VP, Strategic Partnerships",
    company: "Google",
    campus: "Boulder",
    location: "Boulder, Colorado",
    seniority: "vp",
    headline: "Let's drill into this offline. My calendar is wide open.",
    availability: "actively_looking",
    intent: "one_on_one_sync",
    intentLine: "Seeking aggressive 1:1 alignment. Will travel for the right synergy.",
    avatarHue: 4,
    degree: 2,
    tags: [
      peer("Forearms", "physical", 11, 1),
      peer("Grip", "physical", 8),
      peer("Commanding Height", "physical", 6),
      peer("Owns The Room", "behavioral", 9),
      peer("Pings After Hours", "behavioral", 7, 1),
      peer("Fills Out A Blazer", "physical", 5),
    ],
    ledger: { peerRetention: 0.97 },
  }),

  // 6 — Near-blank. The empty-ish state is information.
  profile({
    id: "p_wen",
    displayName: "Wen Li",
    role: "Associate Consultant",
    company: "Bain & Company",
    campus: "Boston — Hancock",
    location: "Greater Boston",
    seniority: "associate",
    headline: "New to the team. Eager to add value.",
    availability: "open_to_opportunities",
    intent: "networking",
    intentLine: "Looking to learn from senior individual contributors.",
    avatarHue: 205,
    degree: 3,
    tags: [peer("Replies Fast", "behavioral", 1)],
    ledger: { peerRetention: 1 },
  }),
];

export const SEED_VIEWER: Profile = profile({
  id: "p_me",
  displayName: "You",
  role: "Senior Product Manager",
  company: "Notion",
  campus: "San Francisco — Mission",
  location: "San Francisco Bay Area",
  seniority: "senior",
  headline: "",
  availability: "open_to_opportunities",
  intent: "synergy",
  intentLine: "",
  avatarHue: 210,
  degree: null,
  tags: [],
});

export function findSeedProfile(id: string): Profile | undefined {
  if (id === SEED_VIEWER.id) return SEED_VIEWER;
  return SEED_PROFILES.find((p) => p.id === id);
}
