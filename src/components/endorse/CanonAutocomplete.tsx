"use client";

import { useEffect, useRef, useState } from "react";
import type { CanonTag } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Autocomplete over the canon list. Picking a canon tag is the low-friction
 * path (it's "on the record"); free-form is deliberately separate and harder.
 */
export function CanonAutocomplete({
  onPick,
  disabled,
}: {
  onPick: (tag: CanonTag) => void;
  disabled?: boolean;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<CanonTag[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/canon?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
        });
        setResults(await res.json());
        setOpen(true);
      } catch {
        /* aborted */
      }
    }, 160);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={boxRef} className="relative">
      <input
        value={q}
        disabled={disabled}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        placeholder="Search endorsements…"
        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink disabled:opacity-50"
      />
      {open && results.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-border bg-surface shadow-lg">
          {results.map((tag) => (
            <li key={tag.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(tag);
                  setQ("");
                  setResults([]);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-ink hover:bg-brand-tint"
              >
                <span>{tag.label}</span>
                <span className={cn("text-[10px] uppercase tracking-wide text-ink-faint")}>
                  {tag.category}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
