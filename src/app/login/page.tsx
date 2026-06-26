import { Card, CardSection } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { signIn, signUp } from "./actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const sp = await searchParams;

  return (
    <div className="flex flex-col gap-4 pt-8">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-ink">Sign in to Drillin</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Source the right people. Align offline.
        </p>
      </div>

      <Card>
        <CardSection className="flex flex-col gap-3">
          {sp.error && (
            <p className="rounded-md border border-[#e7baba] bg-[#fdecec] px-3 py-2 text-[13px] text-critical">
              {sp.error}
            </p>
          )}
          {sp.notice && (
            <p className="rounded-md border border-border bg-surface-sunken px-3 py-2 text-[13px] text-ink-muted">
              {sp.notice}
            </p>
          )}

          <form className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-ink-muted">
              Work email
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink"
                placeholder="you@company.com"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-ink-muted">
              Password
              <input
                type="password"
                name="password"
                required
                minLength={6}
                autoComplete="current-password"
                className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink"
                placeholder="••••••••"
              />
            </label>

            <div className="mt-1 flex flex-col gap-2">
              <Button formAction={signIn}>Sign in</Button>
              <Button formAction={signUp} variant="secondary">
                Create account
              </Button>
            </div>
          </form>
        </CardSection>
      </Card>

      <p className="px-2 text-center text-xs text-ink-faint">
        By creating an account you confirm you are 18+ and consent to a
        professional profile. Endorsements are written by others.
      </p>
    </div>
  );
}
