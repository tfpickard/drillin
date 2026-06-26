/**
 * Domain types shared by the data layer and the UI. These mirror the schema in
 * src/lib/db/schema.ts but are decoupled so presentational components never
 * import Drizzle. Anything the client can see lives here; anything it must not
 * (e.g. endorser identity) is deliberately absent.
 */

export type Availability = "actively_looking" | "open_to_opportunities";

export type Intent =
  | "networking"
  | "synergy"
  | "mentorship"
  | "disruption"
  | "one_on_one_sync";

export type Seniority =
  | "intern"
  | "associate"
  | "mid"
  | "senior"
  | "staff"
  | "principal"
  | "director"
  | "vp"
  | "c_suite";

export type TagCategory = "corporate" | "physical" | "behavioral";
export type TagTier = "self" | "peer";

/** A canon entry from the ~1000-strong curated list. */
export interface CanonTag {
  id: string;
  label: string;
  category: TagCategory;
}

/**
 * A tag as rendered on a profile. Endorser identity is never present — peer
 * tags only ever carry aggregate counts and the mutual-connection leak.
 */
export interface ProfileTag {
  label: string;
  tier: TagTier;
  category: TagCategory | "freeform";
  /** Distinct endorsers. Only meaningful for peer tags. */
  count: number;
  /** Endorsers who are also connections of the viewer. The leak. */
  mutual: number;
  /** Free-form tags awaiting the subject's approval (visible only to subject). */
  pending?: boolean;
}

export type LedgerSeverity = "nominal" | "elevated" | "high";

/**
 * The public Profile Integrity ledger (spec §4). Rendered in flat analytics
 * voice on every profile. Hides and declines are counts over a rolling 30d
 * window — habit framing, not a one-off.
 */
export interface IntegrityLedger {
  hidden30d: number;
  declined30d: number;
  selfRatio: number;
  selfRatioSeverity: LedgerSeverity;
  /** active peer tags / ever-received peer tags, as a fraction. */
  peerRetention: number;
}

export type EndorsementStatus = "pending" | "active" | "hidden" | "declined";

/**
 * The owner's own endorsement row, with id, for management (hide/approve/
 * decline/delete). Only ever returned for your own profile.
 */
export interface MyEndorsement {
  id: string;
  label: string;
  tier: TagTier;
  kind: "canon" | "freeform";
  category: TagCategory | "freeform";
  status: EndorsementStatus;
}

export type ConnectionDegree = 1 | 2 | 3 | null;

/** A card in the deck / a full profile. */
export interface Profile {
  id: string;
  displayName: string;
  role: string;
  company: string;
  campus: string;
  location: string;
  seniority: Seniority;
  headline: string;
  availability: Availability;
  intent: Intent;
  /** The deadpan fake intent line on the card. Pure deniability theater. */
  intentLine: string;
  avatarHue: number;
  tags: ProfileTag[];
  ledger: IntegrityLedger;
  /** LinkedIn-style proximity: 1st/2nd/3rd, computed from the match graph. */
  degree: ConnectionDegree;
}

export interface DeckFilters {
  company?: string;
  role?: string;
  campus?: string;
  seniority?: Seniority;
}
