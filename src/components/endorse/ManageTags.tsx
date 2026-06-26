"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MyEndorsement } from "@/lib/types";
import { TagChip } from "@/components/ui/TagChip";
import { Button } from "@/components/ui/Button";
import { approveTag, declineTag, deleteTag, hideTag } from "@/app/actions/endorsements";

/**
 * Manage your own endorsements. The permanence asymmetry is enforced in the UI
 * too: self / approved-free-form tags get "Delete" (no trace); peer canon tags
 * only get "Hide" (which the public ledger records). Pending free-form tags
 * wait for your approve / decline.
 */
export function ManageTags({ items }: { items: MyEndorsement[] }) {
  const router = useRouter();
  const [, start] = useTransition();

  const act = (fn: (id: string) => Promise<unknown>, id: string) =>
    start(async () => {
      await fn(id);
      router.refresh();
    });

  const pending = items.filter((i) => i.status === "pending");
  const active = items.filter((i) => i.status === "active");
  const hidden = items.filter((i) => i.status === "hidden").length;
  const declined = items.filter((i) => i.status === "declined").length;

  return (
    <div className="flex flex-col gap-4">
      {pending.length > 0 && (
        <section className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-self/40 bg-self-tint/40 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-self">
            Pending your approval
          </h3>
          <p className="text-[12px] text-ink-muted">
            Someone wrote these about you. Nothing is public until you approve it.
          </p>
          {pending.map((i) => (
            <div key={i.id} className="flex items-center justify-between gap-2">
              <span className="text-sm text-ink">{i.label}</span>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => act(approveTag, i.id)}>
                  Approve
                </Button>
                <Button variant="danger" onClick={() => act(declineTag, i.id)}>
                  Decline
                </Button>
              </div>
            </div>
          ))}
        </section>
      )}

      {active.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
            Manage endorsements
          </h3>
          <ul className="flex flex-col divide-y divide-border rounded-[var(--radius-card)] border border-border bg-surface">
            {active.map((i) => {
              const deletable = i.tier === "self" || i.kind === "freeform";
              return (
                <li key={i.id} className="flex items-center justify-between gap-2 px-3 py-2">
                  <TagChip label={i.label} tier={i.tier} count={1} />
                  {deletable ? (
                    <button
                      onClick={() => act(deleteTag, i.id)}
                      className="text-xs text-ink-muted hover:text-critical"
                    >
                      Delete
                    </button>
                  ) : (
                    <button
                      onClick={() => act(hideTag, i.id)}
                      className="text-xs text-ink-muted hover:text-critical"
                      title="Peer endorsements are on the record. Hiding is recorded on your public ledger."
                    >
                      Hide
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {(hidden > 0 || declined > 0) && (
        <p className="px-1 text-xs text-ink-faint">
          {hidden > 0 && `${hidden} hidden`}
          {hidden > 0 && declined > 0 && " · "}
          {declined > 0 && `${declined} declined`}
          . These are reflected on your public Profile Integrity ledger.
        </p>
      )}
    </div>
  );
}
