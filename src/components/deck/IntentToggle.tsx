"use client";

import { useState } from "react";
import type { Intent } from "@/lib/types";

const OPTIONS: { value: Intent; label: string }[] = [
  { value: "networking", label: "Networking" },
  { value: "synergy", label: "Synergy" },
  { value: "mentorship", label: "Mentorship" },
  { value: "disruption", label: "Disruption" },
  { value: "one_on_one_sync", label: "1:1 Sync" },
];

/**
 * Deniability theater (spec §1). Every option routes to the identical deck.
 * It does nothing. The plausible deniability is the feature — so it is styled
 * to look exactly as functional as the real filters.
 */
export function IntentToggle() {
  const [intent, setIntent] = useState<Intent>("synergy");

  return (
    <label className="flex items-center gap-2 text-xs text-ink-muted">
      <span className="whitespace-nowrap">Looking for:</span>
      <select
        value={intent}
        onChange={(e) => setIntent(e.target.value as Intent)}
        className="rounded-md border border-border bg-surface px-2 py-1 text-xs font-medium text-ink"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
