import type { Profile } from "@/lib/types";

/**
 * The app narrates your standing back to you, flatly (spec §2). Two states:
 *  - blank: "Nobody's vouched for you."
 *  - all-self-endorsed: "Reads as cope."
 * Sincere, never winking. If neither applies, renders nothing.
 */
export function EndorsementBanner({ profile }: { profile: Profile }) {
  const visible = profile.tags.filter((t) => !t.pending);
  const peer = visible.filter((t) => t.tier === "peer");
  const self = visible.filter((t) => t.tier === "self");

  if (visible.length === 0) {
    return (
      <Banner>
        <strong>No endorsements yet.</strong> Nobody&rsquo;s vouched for you.
      </Banner>
    );
  }

  if (self.length > 0 && peer.length === 0) {
    return (
      <Banner>
        <strong>Entirely self-endorsed.</strong> Reads as cope.
      </Banner>
    );
  }

  return null;
}

function Banner({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md border border-border bg-surface-sunken px-3 py-2 text-[13px] text-ink-muted">
      {children}
    </p>
  );
}
