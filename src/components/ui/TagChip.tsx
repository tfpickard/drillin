import { cn } from "@/lib/utils";

/**
 * The two tag classes are visually distinct on purpose (spec §2):
 * - self-endorsed: amber, count renders as "· you". Obvious cope.
 * - peer-endorsed: blue, real count, carries weight because you didn't write it.
 *
 * Peer chips can leak attribution ("· 4, incl. 1 mutual connection") — just
 * enough to obsess over who, never enough to confirm.
 */
export type TagTier = "self" | "peer";

interface TagChipProps {
  label: string;
  tier: TagTier;
  /** Peer count. Ignored for self tags (which render "· you"). */
  count?: number;
  /** Mutual connections among the endorsers. The perfect dose is 1. */
  mutual?: number;
  pending?: boolean;
  className?: string;
}

export function TagChip({ label, tier, count, mutual, pending, className }: TagChipProps) {
  const isSelf = tier === "self";

  const meta = isSelf
    ? "· you"
    : [
        count != null ? `· ${count}` : null,
        mutual && mutual > 0
          ? `, incl. ${mutual} mutual connection${mutual === 1 ? "" : "s"}`
          : null,
      ]
        .filter(Boolean)
        .join("");

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-1 text-[13px] font-medium leading-4",
        isSelf
          ? "border-[#f3d9b6] bg-self-tint text-self"
          : "border-[#cfe0f5] bg-peer-tint text-peer",
        pending && "border-dashed opacity-70",
        className,
      )}
    >
      <span>{label}</span>
      {meta && <span className="ml-1 font-normal opacity-80">{meta}</span>}
      {pending && <span className="ml-1 font-normal italic opacity-70">· pending</span>}
    </span>
  );
}
