import type { DeckFilters, MyEndorsement, Profile } from "@/lib/types";
import { SEED_PROFILES, SEED_VIEWER, findSeedProfile } from "./seed-profiles";
import {
  getDeckLive,
  getProfileLive,
  getFacetsLive,
  getViewerLive,
  getMyEndorsementsLive,
} from "./supabase";

export { searchCanon, CANON_TAGS } from "./canon";
export { SEED_VIEWER } from "./seed-profiles";

/**
 * Data access. Dispatches between the in-memory seed layer (renders without a
 * live project) and the Supabase-backed layer. Both share this async interface.
 *
 * Seed mode is the default so a fresh clone renders. Set DRILLIN_USE_SEED_DATA=0
 * (with Supabase env present) to run against the real database.
 */
const USE_SEED =
  process.env.DRILLIN_USE_SEED_DATA === "1" ||
  !process.env.NEXT_PUBLIC_SUPABASE_URL;

export function isSeedMode(): boolean {
  return USE_SEED;
}

export async function getDeck(filters: DeckFilters = {}): Promise<Profile[]> {
  if (!USE_SEED) return getDeckLive(filters);

  // Dumb ranking (spec §1): filter, then a stable shuffle. The ORDER BY seam
  // for embedding similarity lives here.
  const deck = SEED_PROFILES.filter((p) => {
    if (filters.company && p.company !== filters.company) return false;
    if (filters.role && p.role !== filters.role) return false;
    if (filters.campus && p.campus !== filters.campus) return false;
    if (filters.seniority && p.seniority !== filters.seniority) return false;
    return true;
  });
  return stableShuffle(deck);
}

export async function getProfile(id: string): Promise<Profile | null> {
  if (!USE_SEED) return getProfileLive(id);
  return findSeedProfile(id) ?? null;
}

/**
 * The signed-in user's own profile. Seed mode returns the blank placeholder;
 * live mode returns the authenticated profile, or null if signed out / not yet
 * onboarded (the caller redirects).
 */
export async function getViewer(): Promise<Profile | null> {
  if (!USE_SEED) return getViewerLive();
  return SEED_VIEWER;
}

/** The signed-in user's own endorsement rows (with ids) for management. */
export async function getMyEndorsements(): Promise<MyEndorsement[]> {
  if (!USE_SEED) return getMyEndorsementsLive();
  return [];
}

/** Distinct filter facet values present in the deck, for the sourcing bar. */
export async function getFacets() {
  if (!USE_SEED) return getFacetsLive();
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
