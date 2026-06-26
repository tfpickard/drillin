"use server";

import { getServerSupabase } from "@/lib/supabase/server";

type Result = { ok: true } | { error: string };

/** Send a message into a conversation. RLS enforces match membership. */
export async function sendMessage(conversationId: string, body: string): Promise<Result> {
  const trimmed = body.trim();
  if (!trimmed) return { error: "Empty message." };

  const supabase = await getServerSupabase();
  if (!supabase) return { error: "Sign in first." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };

  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    body: trimmed,
  });
  if (error) return { error: error.message };
  return { ok: true };
}
