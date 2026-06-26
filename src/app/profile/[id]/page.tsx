import { notFound } from "next/navigation";
import Link from "next/link";
import { getProfile, isSeedMode } from "@/lib/data";
import { getServerSupabase } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { ProfileCard } from "@/components/ProfileCard";
import { LedgerPanel } from "@/components/ui/LedgerPanel";
import { EndorsementBanner } from "@/components/EndorsementBanner";
import { EndorsePanel } from "@/components/endorse/EndorsePanel";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) notFound();

  // Peer endorsing is available to a signed-in user viewing someone else.
  let canEndorse = false;
  if (!isSeedMode()) {
    const supabase = await getServerSupabase();
    const {
      data: { user },
    } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
    canEndorse = !!user && user.id !== profile.id;
  }

  return (
    <div className="flex flex-col gap-3">
      <Link href="/" className="text-xs text-brand hover:underline">
        ← Back to sourcing
      </Link>

      <Card className="overflow-hidden">
        <ProfileCard profile={profile} />
      </Card>

      <EndorsementBanner profile={profile} />

      {canEndorse && <EndorsePanel subjectId={profile.id} mode="peer" />}

      {/* Public on every profile — scrubbing is itself a metric (spec §4). */}
      <LedgerPanel ledger={profile.ledger} />
    </div>
  );
}
