import type { ProfileTag } from "@/lib/types";
import { TagChip } from "@/components/ui/TagChip";

export function TagList({ tags }: { tags: ProfileTag[] }) {
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((t, i) => (
        <TagChip
          key={`${t.label}-${t.tier}-${i}`}
          label={t.label}
          tier={t.tier}
          count={t.count}
          mutual={t.mutual}
          pending={t.pending}
        />
      ))}
    </div>
  );
}
