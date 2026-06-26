import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getConversation, isSeedMode } from "@/lib/data";
import { getServerSupabase } from "@/lib/supabase/server";
import { ChatThread } from "@/components/chat/ChatThread";

export const dynamic = "force-dynamic";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  if (isSeedMode()) redirect("/");
  const { matchId } = await params;

  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  if (!user) redirect("/login");

  const thread = await getConversation(matchId);
  if (!thread) notFound();

  return (
    <div className="flex flex-col gap-3">
      <Link href="/matches" className="text-xs text-brand hover:underline">
        ← Connections
      </Link>
      <ChatThread thread={thread} />
    </div>
  );
}
