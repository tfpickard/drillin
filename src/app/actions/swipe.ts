"use server";

import { getServerSupabase } from "@/lib/supabase/server";

type SwipeResult = { matchId: string | null } | { error: string };

/**
 * Record a swipe. The RPC creates a match (and conversation) on a mutual
 * right-swipe and returns the match id; otherwise null.
 */
export async function swipeProfile(
  targetId: string,
  direction: "right" | "left",
): Promise<SwipeResult> {
  const supabase = await getServerSupabase();
  if (!supabase) return { error: "Sign in to swipe." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to swipe." };

  const { data, error } = await supabase.rpc("swipe", {
    p_target: targetId,
    p_direction: direction,
  });
  if (error) return { error: error.message };
  return { matchId: (data as string | null) ?? null };
}
