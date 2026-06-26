"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";

type Result = { ok: true } | { error: string };

async function authed() {
  const supabase = await getServerSupabase();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { supabase, userId: user.id };
}

/** Endorse a profile with a canon tag. Self vs peer is derived server-side. */
export async function endorseCanon(subjectId: string, canonTagId: string): Promise<Result> {
  const a = await authed();
  if (!a) return { error: "Sign in to endorse." };
  const { error } = await a.supabase.rpc("endorse", {
    p_subject: subjectId,
    p_canon_tag_id: canonTagId,
    p_freeform_label: null,
  });
  if (error) return { error: humanize(error.message) };
  revalidatePath(`/profile/${subjectId}`);
  revalidatePath("/me");
  return { ok: true };
}

/**
 * Free-form endorsement. The endorser must type the whole attribute — that
 * friction is the consent gate. Peer free-form lands pending until approved.
 */
export async function endorseFreeform(subjectId: string, label: string): Promise<Result> {
  const a = await authed();
  if (!a) return { error: "Sign in to endorse." };
  const trimmed = label.trim();
  if (trimmed.length < 3) return { error: "Type the full attribute." };
  const { error } = await a.supabase.rpc("endorse", {
    p_subject: subjectId,
    p_canon_tag_id: null,
    p_freeform_label: trimmed,
  });
  if (error) return { error: humanize(error.message) };
  revalidatePath(`/profile/${subjectId}`);
  revalidatePath("/me");
  return { ok: true };
}

async function mutate(fn: string, id: string): Promise<Result> {
  const a = await authed();
  if (!a) return { error: "Sign in first." };
  const { error } = await a.supabase.rpc(fn, { p_id: id });
  if (error) return { error: humanize(error.message) };
  revalidatePath("/me");
  return { ok: true };
}

export async function hideTag(id: string): Promise<Result> {
  return mutate("hide_endorsement", id);
}
export async function approveTag(id: string): Promise<Result> {
  return mutate("approve_endorsement", id);
}
export async function declineTag(id: string): Promise<Result> {
  return mutate("decline_endorsement", id);
}
export async function deleteTag(id: string): Promise<Result> {
  return mutate("delete_endorsement", id);
}

function humanize(message: string): string {
  if (message.includes("daily endorsement limit")) return "You've hit today's endorsement limit.";
  if (message.includes("slow down")) return "Slow down on this profile.";
  if (message.includes("blocked")) return "You can't endorse this person.";
  if (message.includes("duplicate key")) return "You've already given that endorsement.";
  return message;
}
