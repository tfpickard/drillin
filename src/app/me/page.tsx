import { getViewer } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { ProfileCard } from "@/components/ProfileCard";
import { LedgerPanel } from "@/components/ui/LedgerPanel";
import { EndorsementBanner } from "@/components/EndorsementBanner";

export default async function MyProfilePage() {
  const me = await getViewer();

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-sm font-semibold text-ink">My Profile</h1>

      <Card className="overflow-hidden">
        <ProfileCard profile={me} />
      </Card>

      {/* Your profile starts blank and is written by other people (spec §2). */}
      <EndorsementBanner profile={me} />

      <LedgerPanel ledger={me.ledger} />

      <p className="px-1 text-xs text-ink-faint">
        Endorsements are added by your connections. The only way to get written
        on is to connect.
      </p>
    </div>
  );
}
