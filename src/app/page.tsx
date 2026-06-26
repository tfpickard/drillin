import { getDeck, getFacets, isSeedMode } from "@/lib/data";
import { DeckScreen } from "@/components/deck/DeckScreen";

export const dynamic = "force-dynamic";

export default async function SourcePage() {
  const [profiles, facets] = await Promise.all([getDeck(), getFacets()]);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="text-sm font-semibold text-ink">Candidate Sourcing</h1>
        <p className="text-xs text-ink-muted">
          {profiles.length} profiles match your reach. Swipe to express interest.
        </p>
      </div>
      <DeckScreen profiles={profiles} facets={facets} live={!isSeedMode()} />
    </div>
  );
}
