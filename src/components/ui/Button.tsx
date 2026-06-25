import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-hover border-transparent",
  secondary:
    "bg-surface text-brand hover:bg-brand-tint border-brand font-semibold",
  ghost: "bg-transparent text-ink-muted hover:bg-surface-sunken border-transparent",
  danger: "bg-surface text-critical hover:bg-[#fdecec] border-[#e7baba]",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: React.ComponentProps<"button"> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
