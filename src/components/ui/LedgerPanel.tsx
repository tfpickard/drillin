import type { IntegrityLedger, LedgerSeverity } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Profile Integrity — public on every profile (spec §4). Flat credit-report
 * voice. The cruelty is in the framing, never the tone: it states metrics, it
 * does not editorialize. Behavioral framing ("last month") over raw state.
 */
export function LedgerPanel({ ledger }: { ledger: IntegrityLedger }) {
  return (
    <section className="rounded-[var(--radius-card)] border border-border bg-surface-sunken">
      <header className="border-b border-border px-4 py-2.5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Profile Integrity
        </h3>
      </header>
      <dl className="divide-y divide-border">
        <Row
          label="Endorsements hidden"
          value={behavioral(ledger.hidden30d)}
          window="last 30 days"
        />
        <Row
          label="Endorsements declined"
          value={behavioral(ledger.declined30d)}
          window="last 30 days"
        />
        <Row
          label="Self-endorsement ratio"
          value={`${Math.round(ledger.selfRatio * 100)}%`}
          severity={ledger.selfRatioSeverity}
        />
        <Row label="Peer retention" value={`${Math.round(ledger.peerRetention * 100)}%`} />
      </dl>
    </section>
  );
}

/** "Hid 3 — last month" implies a habit; "0" reads clean. */
function behavioral(n: number): string {
  return n === 0 ? "None on record" : `${n}`;
}

const severityClass: Record<LedgerSeverity, string> = {
  nominal: "text-ink-faint",
  elevated: "text-caution",
  high: "text-critical",
};

function Row({
  label,
  value,
  window,
  severity,
}: {
  label: string;
  value: string;
  window?: string;
  severity?: LedgerSeverity;
}) {
  return (
    <div className="flex items-baseline justify-between px-4 py-2.5">
      <dt className="text-[13px] text-ink-muted">{label}</dt>
      <dd className="flex items-baseline gap-1.5 text-right">
        <span className="text-[13px] font-semibold text-ink">{value}</span>
        {window && <span className="text-xs text-ink-faint">· {window}</span>}
        {severity && (
          <span className={cn("text-xs font-medium", severityClass[severity])}>
            ({severity})
          </span>
        )}
      </dd>
    </div>
  );
}
