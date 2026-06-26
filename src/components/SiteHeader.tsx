import Link from "next/link";
import { isSeedMode } from "@/lib/data";
import { getServerSupabase } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";

/**
 * Corporate top bar with auth-aware nav. In seed mode there's no auth, so it
 * always shows the signed-in shape (My Profile). In live mode it reflects the
 * real session.
 */
export async function SiteHeader() {
  const signedIn = await isSignedIn();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-1 text-brand">
          <span className="grid h-7 w-7 place-items-center rounded bg-brand text-sm font-bold text-white">
            in
          </span>
          <span className="text-lg font-bold tracking-tight text-ink">Drillin</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm text-ink-muted">
          <Link href="/" className="hover:text-brand">
            Source
          </Link>
          {signedIn ? (
            <>
              <Link href="/matches" className="hover:text-brand">
                Connections
              </Link>
              <Link href="/me" className="hover:text-brand">
                My Profile
              </Link>
              <form action={signOut}>
                <button type="submit" className="hover:text-brand">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className="font-semibold text-brand hover:underline">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

async function isSignedIn(): Promise<boolean> {
  if (isSeedMode()) return true;
  const supabase = await getServerSupabase();
  if (!supabase) return true;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return !!user;
}
