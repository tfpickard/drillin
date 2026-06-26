import { notFound } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { ProfileCard } from "@/components/ProfileCard";
import { LedgerPanel } from "@/components/ui/LedgerPanel";
import { EndorsementBanner } from "@/components/EndorsementBanner";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) notFound();

  return (
    <div className="flex flex-col gap-3">
      <Link href="/" className="text-xs text-brand hover:underline">
        ← Back to sourcing
      </Link>

      <Card className="overflow-hidden">
        <ProfileCard profile={profile} />
      </Card>

      <EndorsementBanner profile={profile} />

      {/* Public on every profile — scrubbing is itself a metric (spec §4). */}
      <LedgerPanel ledger={profile.ledger} />
    </div>
  );
}
