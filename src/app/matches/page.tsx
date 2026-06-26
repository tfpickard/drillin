import { redirect } from "next/navigation";
import Link from "next/link";
import { getMatches, isSeedMode } from "@/lib/data";
import { getServerSupabase } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/Avatar";

export const dynamic = "force-dynamic";

export default async function MatchesPage() {
  if (isSeedMode()) redirect("/");

  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  if (!user) redirect("/login");

  const matches = await getMatches();

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-sm font-semibold text-ink">Connections</h1>

      {matches.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-sm text-ink">No mutual connections yet.</p>
          <p className="mt-1 text-xs text-ink-muted">
            When two people both express interest, it&rsquo;s a match.
          </p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {matches.map((m) => (
            <li key={m.matchId}>
              <Link
                href={m.conversationId ? `/chat/${m.matchId}` : "#"}
                className="flex items-center gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-3 hover:bg-surface-sunken"
              >
                <Avatar name={m.otherName} hue={m.otherHue} size={44} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{m.otherName}</p>
                  <p className="text-xs text-ink-faint">Take this conversation offline.</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
