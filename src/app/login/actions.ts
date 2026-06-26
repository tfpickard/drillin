"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";

function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

export async function signIn(formData: FormData) {
  const supabase = await getServerSupabase();
  if (!supabase) redirect("/login?error=Supabase+is+not+configured");

  const { error } = await supabase.auth.signInWithPassword({
    email: field(formData, "email"),
    password: field(formData, "password"),
  });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user!.id)
    .maybeSingle();

  redirect(profile ? "/" : "/onboarding");
}

export async function signUp(formData: FormData) {
  const supabase = await getServerSupabase();
  if (!supabase) redirect("/login?error=Supabase+is+not+configured");

  const origin = (await headers()).get("origin") ?? "";
  const { data, error } = await supabase.auth.signUp({
    email: field(formData, "email"),
    password: field(formData, "password"),
    options: { emailRedirectTo: `${origin}/auth/confirm` },
  });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);

  // If email confirmation is disabled the user is signed in immediately.
  if (data.session) redirect("/onboarding");
  redirect("/login?notice=Check+your+email+to+confirm+your+account.");
}

export async function signOut() {
  const supabase = await getServerSupabase();
  if (supabase) await supabase.auth.signOut();
  redirect("/login");
}
