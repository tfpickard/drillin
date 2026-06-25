"use client";

import type { DeckFilters } from "@/lib/types";
import { IntentToggle } from "./IntentToggle";

interface Facets {
  company: string[];
  role: string[];
  campus: string[];
}

/**
 * The sourcing bar. Mimics a recruiter's candidate-sourcing tool — Company,
 * Role, Campus, Seniority are the REAL filters. This taxonomy is the comedic
 * engine: professional sourcing UX pointed at hookups.
 */
export function FilterBar({
  facets,
  filters,
  onChange,
}: {
  facets: Facets;
  filters: DeckFilters;
  onChange: (next: DeckFilters) => void;
}) {
  function set<K extends keyof DeckFilters>(key: K, value: string) {
    onChange({ ...filters, [key]: value || undefined });
  }

  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-border bg-surface p-3">
      <div className="grid grid-cols-2 gap-2">
        <Select label="Company" value={filters.company} options={facets.company} onChange={(v) => set("company", v)} />
        <Select label="Role" value={filters.role} options={facets.role} onChange={(v) => set("role", v)} />
        <Select label="Campus" value={filters.campus} options={facets.campus} onChange={(v) => set("campus", v)} />
        <Select
          label="Seniority"
          value={filters.seniority}
          options={SENIORITY}
          onChange={(v) => set("seniority", v)}
        />
      </div>
      <div className="flex items-center justify-between border-t border-border pt-2">
        <IntentToggle />
        <button
          type="button"
          onClick={() => onChange({})}
          className="text-xs text-brand hover:underline"
        >
          Clear filters
        </button>
      </div>
    </div>
  );
}

const SENIORITY = [
  "intern",
  "associate",
  "mid",
  "senior",
  "staff",
  "principal",
  "director",
  "vp",
  "c_suite",
];

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value?: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
        {label}
      </span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-ink"
      >
        <option value="">Any</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o.replace(/_/g, " ")}
          </option>
        ))}
      </select>
    </label>
  );
}
