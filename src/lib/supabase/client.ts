import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client (Client Components — e.g. the realtime chat
 * subscription). Uses the publishable key, which is safe to ship to the
 * browser precisely because RLS is enabled on every table.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase browser env missing (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)",
    );
  }
  return createBrowserClient(url, key);
}
