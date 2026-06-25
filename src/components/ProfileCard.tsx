import type { Availability, ConnectionDegree, Profile } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { Pill } from "@/components/ui/Pill";
import { TagList } from "@/components/TagList";

const availabilityLabel: Record<Availability, string> = {
  actively_looking: "Actively Looking",
  open_to_opportunities: "Open to Opportunities",
};

function degreeLabel(d: ConnectionDegree): string | null {
  if (d == null) return null;
  return `${d}${d === 1 ? "st" : d === 2 ? "nd" : "rd"} connection`;
}

/**
 * The card. Sterile LinkedIn-blue chrome over whatever the endorsements say.
 * Used in the deck and as the header of a full profile.
 */
export function ProfileCard({
  profile,
  compact = false,
}: {
  profile: Profile;
  compact?: boolean;
}) {
  const degree = degreeLabel(profile.degree);
  const visibleTags = profile.tags.filter((t) => !t.pending);

  return (
    <div className="flex h-full flex-col">
      {/* banner strip — pure enterprise garnish */}
      <div
        className="h-14 w-full rounded-t-[var(--radius-card)]"
        style={{
          background: `linear-gradient(120deg, hsl(${profile.avatarHue} 38% 40%), hsl(${profile.avatarHue} 30% 28%))`,
        }}
      />
      <div className="-mt-7 flex flex-col gap-3 px-4 pb-4">
        <div className="flex items-end justify-between">
          <Avatar
            name={profile.displayName}
            hue={profile.avatarHue}
            size={64}
            className="ring-4 ring-surface"
          />
          <Pill tone={profile.availability === "actively_looking" ? "brand" : "open"}>
            {availabilityLabel[profile.availability]}
          </Pill>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold leading-tight text-ink">
              {profile.displayName}
            </h2>
            {degree && (
              <span className="text-xs text-ink-faint">· {degree}</span>
            )}
          </div>
          <p className="text-sm text-ink">
            {profile.role} at {profile.company}
          </p>
          <p className="mt-0.5 text-xs text-ink-faint">
            {profile.campus} · {profile.location}
          </p>
        </div>

        {profile.headline && (
          <p className="text-[15px] leading-snug text-ink">{profile.headline}</p>
        )}

        {profile.intentLine && (
          <p className="border-l-2 border-border pl-3 text-[13px] italic text-ink-muted">
            {profile.intentLine}
          </p>
        )}

        {!compact && visibleTags.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
              Endorsements
            </h3>
            <TagList tags={visibleTags} />
          </div>
        )}
      </div>
    </div>
  );
}
