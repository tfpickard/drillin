import { createClient } from "@supabase/supabase-js";

/**
 * Privileged server-only client using the secret key. Bypasses RLS — use it
 * exclusively for trusted backend work (seeding, admin moderation tooling,
 * creating auth users for fake profiles). NEVER import this into a Client
 * Component; the secret key must never reach the browser.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase admin env missing (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY)",
    );
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
