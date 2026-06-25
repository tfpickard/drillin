import { cn } from "@/lib/utils";

/**
 * Sterile placeholder avatar — a corporate headshot block. Initials on a muted
 * brand-tinted field. No photos in the MVP; the joke lives in the text.
 */
export function Avatar({
  name,
  hue,
  size = 56,
  className,
}: {
  name: string;
  hue: number;
  size?: number;
  className?: string;
}) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-semibold text-white",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: `linear-gradient(135deg, hsl(${hue} 42% 46%), hsl(${hue} 38% 34%))`,
      }}
      aria-hidden
    >
      {initials}
    </div>
  );
}
