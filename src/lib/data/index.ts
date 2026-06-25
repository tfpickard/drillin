import type { DeckFilters, Profile } from "@/lib/types";
import { SEED_PROFILES, SEED_VIEWER, findSeedProfile } from "./seed-profiles";

export { searchCanon, CANON_TAGS } from "./canon";
export { SEED_VIEWER } from "./seed-profiles";

/**
 * Data access. Today this is seed-backed so the app renders without a live
 * Supabase project. The function signatures are the seam: a Supabase
 * implementation drops in behind the same async interface, calling the
 * SECURITY DEFINER RPCs (get_profile_tags, get_integrity_ledger, swipe, …)
 * defined in supabase/migrations/0001_init.sql.
 */
const USE_SEED =
  process.env.DRILLIN_USE_SEED_DATA === "1" ||
  !process.env.NEXT_PUBLIC_SUPABASE_URL;

export async function getDeck(filters: DeckFilters = {}): Promise<Profile[]> {
  if (!USE_SEED) throw new Error("Supabase deck not wired yet — set DRILLIN_USE_SEED_DATA=1");

  // Dumb ranking (spec §1): filter, then a stable shuffle. The ORDER BY seam
  // for embedding similarity lives here.
  let deck = SEED_PROFILES.filter((p) => {
    if (filters.company && p.company !== filters.company) return false;
    if (filters.role && p.role !== filters.role) return false;
    if (filters.campus && p.campus !== filters.campus) return false;
    if (filters.seniority && p.seniority !== filters.seniority) return false;
    return true;
  });
  deck = stableShuffle(deck);
  return deck;
}

export async function getProfile(id: string): Promise<Profile | null> {
  if (!USE_SEED) throw new Error("Supabase profile read not wired yet");
  return findSeedProfile(id) ?? null;
}

export async function getViewer(): Promise<Profile> {
  return SEED_VIEWER;
}

/** Distinct filter facet values present in the deck, for the sourcing bar. */
export async function getFacets() {
  return {
    company: unique(SEED_PROFILES.map((p) => p.company)),
    role: unique(SEED_PROFILES.map((p) => p.role)),
    campus: unique(SEED_PROFILES.map((p) => p.campus)),
  };
}

function unique(xs: string[]): string[] {
  return [...new Set(xs)].sort();
}

// Deterministic shuffle so server/client render the same order (no hydration
// mismatch) while still looking un-sorted.
function stableShuffle<T>(xs: T[]): T[] {
  return [...xs]
    .map((x, i) => [x, (i * 2654435761) % 2 ** 31] as const)
    .sort((a, b) => a[1] - b[1])
    .map(([x]) => x);
}
