import { redirect } from "next/navigation";
import { getMyEndorsements, getProfile, getViewer, isSeedMode } from "@/lib/data";
import { getServerSupabase } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { ProfileCard } from "@/components/ProfileCard";
import { LedgerPanel } from "@/components/ui/LedgerPanel";
import { EndorsementBanner } from "@/components/EndorsementBanner";
import { EndorsePanel } from "@/components/endorse/EndorsePanel";
import { ManageTags } from "@/components/endorse/ManageTags";
import type { MyEndorsement, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MyProfilePage() {
  let me: Profile | null;
  let mine: MyEndorsement[] = [];
  const seed = isSeedMode();

  if (seed) {
    me = await getViewer();
  } else {
    const supabase = await getServerSupabase();
    const {
      data: { user },
    } = (await supabase!.auth.getUser()) ?? { data: { user: null } };
    if (!user) redirect("/login");
    me = await getProfile(user.id);
    if (!me) redirect("/onboarding");
    mine = await getMyEndorsements();
  }

  if (!me) redirect("/login");

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-sm font-semibold text-ink">My Profile</h1>

      <Card className="overflow-hidden">
        <ProfileCard profile={me} />
      </Card>

      {/* Your profile starts blank and is written by other people (spec §2). */}
      <EndorsementBanner profile={me} />

      <LedgerPanel ledger={me.ledger} />

      {!seed && (
        <>
          <EndorsePanel subjectId={me.id} mode="self" />
          <ManageTags items={mine} />
        </>
      )}

      <p className="px-1 text-xs text-ink-faint">
        Endorsements are added by your connections. The only way to get written
        on is to connect.
      </p>
    </div>
  );
}
