"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DeckFilters, Profile } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { swipeProfile } from "@/app/actions/swipe";
import { FilterBar } from "./FilterBar";
import { SwipeCard } from "./SwipeCard";
import { MatchScreen } from "./MatchScreen";

// Seed profiles who have already swiped right on you, so the double opt-in
// match screen is demoable from a cold (seed) deck.
const MUTUAL_INTEREST = new Set(["p_marcus", "p_tobias"]);

interface Facets {
  company: string[];
  role: string[];
  campus: string[];
}

interface Match {
  profile: Profile;
  matchId: string | null;
}

export function DeckScreen({
  profiles,
  facets,
  live = false,
}: {
  profiles: Profile[];
  facets: Facets;
  live?: boolean;
}) {
  const router = useRouter();
  const [filters, setFilters] = useState<DeckFilters>({});
  const [index, setIndex] = useState(0);
  const [matched, setMatched] = useState<Match | null>(null);

  const deck = useMemo(() => applyFilters(profiles, filters), [profiles, filters]);

  // Reset the cursor whenever the filtered deck identity changes.
  const deckKey = deck.map((p) => p.id).join(",");
  const [seenKey, setSeenKey] = useState(deckKey);
  if (seenKey !== deckKey) {
    setSeenKey(deckKey);
    setIndex(0);
  }

  const top = deck[index];
  const next = deck[index + 1];

  async function decide(profile: Profile, direction: "right" | "left") {
    setIndex((i) => i + 1);
    if (live) {
      const res = await swipeProfile(profile.id, direction);
      if ("matchId" in res && res.matchId) setMatched({ profile, matchId: res.matchId });
    } else if (direction === "right" && MUTUAL_INTEREST.has(profile.id)) {
      setMatched({ profile, matchId: null });
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <FilterBar facets={facets} filters={filters} onChange={setFilters} />

      <div className="relative h-[30rem]">
        {top ? (
          <>
            {next && (
              <div className="absolute inset-0 scale-[0.96] opacity-60">
                <div className="h-full overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface" />
              </div>
            )}
            <SwipeCard
              key={top.id}
              profile={top}
              active={!matched}
              onDecide={(dir) => decide(top, dir)}
            />
            {matched && (
              <MatchScreen
                them={matched.profile}
                onMessage={() =>
                  router.push(
                    matched.matchId
                      ? `/chat/${matched.matchId}`
                      : `/profile/${matched.profile.id}`,
                  )
                }
                onDismiss={() => setMatched(null)}
              />
            )}
          </>
        ) : (
          <EmptyDeck />
        )}
      </div>

      {top && !matched && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="danger" onClick={() => decide(top, "left")}>
            Not a Fit
          </Button>
          <Link
            href={`/profile/${top.id}`}
            className="text-xs text-brand hover:underline"
          >
            View full profile
          </Link>
          <Button variant="secondary" onClick={() => decide(top, "right")}>
            Connect
          </Button>
        </div>
      )}
    </div>
  );
}

function applyFilters(profiles: Profile[], f: DeckFilters): Profile[] {
  return profiles.filter((p) => {
    if (f.company && p.company !== f.company) return false;
    if (f.role && p.role !== f.role) return false;
    if (f.campus && p.campus !== f.campus) return false;
    if (f.seniority && p.seniority !== f.seniority) return false;
    return true;
  });
}

function EmptyDeck() {
  return (
    <div className="grid h-full place-items-center rounded-[var(--radius-card)] border border-dashed border-border bg-surface text-center">
      <div className="px-6">
        <p className="text-sm font-semibold text-ink">You&rsquo;ve reached the end of the pipeline.</p>
        <p className="mt-1 text-xs text-ink-muted">
          No further candidates match your current sourcing criteria.
        </p>
      </div>
    </div>
  );
}
