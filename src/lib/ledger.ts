import type { LedgerSeverity } from "@/lib/types";

/**
 * Self-endorsement ratio → severity label (spec §4). Shared so the seed layer
 * and the live (DB-backed) layer label identically. Thresholds are tunable.
 */
export function severityFromRatio(ratio: number): LedgerSeverity {
  if (ratio >= 0.66) return "high";
  if (ratio >= 0.34) return "elevated";
  return "nominal";
}
