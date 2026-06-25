import { cn } from "@/lib/utils";

type PillTone = "neutral" | "brand" | "open";

const tones: Record<PillTone, string> = {
  neutral: "bg-surface-sunken text-ink-muted border-border",
  // "Actively Looking" — present-tense availability, played as a hiring status.
  brand: "bg-brand-tint text-brand border-transparent",
  // "Open to Opportunities" — the deniable one.
  open: "bg-[#eef3f8] text-ink-muted border-transparent",
};

export function Pill({
  tone = "neutral",
  className,
  ...props
}: React.ComponentProps<"span"> & { tone?: PillTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium leading-5",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
