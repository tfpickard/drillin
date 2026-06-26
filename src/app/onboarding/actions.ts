"use server";

import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";

function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

function hashHue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 360;
}

async function ensureNamed(
  supabase: NonNullable<Awaited<ReturnType<typeof getServerSupabase>>>,
  table: "companies" | "roles",
  name: string,
): Promise<string | null> {
  if (!name) return null;
  const { data } = await supabase
    .from(table)
    .upsert({ name }, { onConflict: "name" })
    .select("id")
    .single();
  return data?.id ?? null;
}

export async function completeOnboarding(formData: FormData) {
  const supabase = await getServerSupabase();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Consent + age gate are required (stubbed verification — spec §Safety).
  if (!formData.get("over18") || !formData.get("consent")) {
    redirect(
      "/onboarding?error=" +
        encodeURIComponent("Confirm you are 18+ and consent to be listed."),
    );
  }

  const displayName = field(formData, "display_name");
  if (!displayName) {
    redirect("/onboarding?error=" + encodeURIComponent("A display name is required."));
  }

  const companyId = await ensureNamed(supabase, "companies", field(formData, "company"));
  const roleId = await ensureNamed(supabase, "roles", field(formData, "role"));

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    display_name: displayName,
    company_id: companyId,
    role_id: roleId,
    campus: field(formData, "campus") || null,
    location: field(formData, "location") || null,
    seniority: field(formData, "seniority") || "mid",
    headline: field(formData, "headline"),
    availability: field(formData, "availability") || "open_to_opportunities",
    intent: field(formData, "intent") || "synergy",
    avatar_hue: hashHue(displayName),
    is_age_verified: true,
    consents_to_listing: true,
  });
  if (error) {
    redirect("/onboarding?error=" + encodeURIComponent(error.message));
  }

  redirect("/me");
}
