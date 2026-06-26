"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CanonTag } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { CanonAutocomplete } from "./CanonAutocomplete";
import { endorseCanon, endorseFreeform } from "@/app/actions/endorsements";

/**
 * Endorse a profile. `mode` is "self" (your own profile) or "peer" (someone
 * else's). The free-form path requires typing the whole attribute — the
 * friction is the consent gate, and for peer endorsements it lands pending.
 */
export function EndorsePanel({
  subjectId,
  mode,
}: {
  subjectId: string;
  mode: "self" | "peer";
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [freeform, setFreeform] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  function run(action: () => Promise<{ ok: true } | { error: string }>) {
    setMsg(null);
    start(async () => {
      const res = await action();
      if ("error" in res) setMsg(res.error);
      else {
        setFreeform("");
        router.refresh();
      }
    });
  }

  return (
    <section className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
        {mode === "self" ? "Endorse yourself" : "Add an endorsement"}
      </h3>

      <CanonAutocomplete
        disabled={pending}
        onPick={(tag: CanonTag) => run(() => endorseCanon(subjectId, tag.id))}
      />

      <div className="flex flex-col gap-1.5 border-t border-border pt-3">
        <label className="text-[11px] font-medium text-ink-faint">
          {mode === "peer"
            ? "Not on the list? Type the whole attribute. It stays private until they approve it."
            : "Or write your own."}
        </label>
        <div className="flex gap-2">
          <input
            value={freeform}
            disabled={pending}
            onChange={(e) => setFreeform(e.target.value)}
            placeholder="Type it out in full"
            className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink disabled:opacity-50"
          />
          <Button
            variant="secondary"
            disabled={pending || freeform.trim().length < 3}
            onClick={() => run(() => endorseFreeform(subjectId, freeform))}
          >
            Submit
          </Button>
        </div>
      </div>

      {msg && <p className="text-[13px] text-critical">{msg}</p>}
    </section>
  );
}
