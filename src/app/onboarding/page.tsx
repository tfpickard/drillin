import { redirect } from "next/navigation";
import { Card, CardSection } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getServerSupabase } from "@/lib/supabase/server";
import { completeOnboarding } from "./actions";

export const dynamic = "force-dynamic";

const SENIORITY = [
  "intern", "associate", "mid", "senior", "staff",
  "principal", "director", "vp", "c_suite",
];
const INTENTS = ["networking", "synergy", "mentorship", "disruption", "one_on_one_sync"];

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await getServerSupabase();

  // Seed mode (no Supabase env): onboarding isn't wired — point at the deck.
  if (!supabase) redirect("/");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("profiles")
    .select("display_name,campus,location,seniority,headline,availability,intent")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-ink">Complete your profile</h1>
        <p className="mt-1 text-sm text-ink-muted">
          This is how you appear when others are sourcing. Your endorsements are
          written by other people — you don&rsquo;t pick those.
        </p>
      </div>

      {sp.error && (
        <p className="rounded-md border border-[#e7baba] bg-[#fdecec] px-3 py-2 text-[13px] text-critical">
          {sp.error}
        </p>
      )}

      <Card>
        <CardSection className="flex flex-col gap-3">
          <form action={completeOnboarding} className="flex flex-col gap-3">
            <Text name="display_name" label="Display name" defaultValue={existing?.display_name} required />
            <div className="grid grid-cols-2 gap-3">
              <Text name="company" label="Company" />
              <Text name="role" label="Role / title" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Text name="campus" label="Campus" defaultValue={existing?.campus ?? ""} placeholder="e.g. Boulder" />
              <Text name="location" label="Location" defaultValue={existing?.location ?? ""} placeholder="Metro area" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select name="seniority" label="Seniority" options={SENIORITY} defaultValue={existing?.seniority ?? "mid"} />
              <Select
                name="availability"
                label="Availability"
                options={["open_to_opportunities", "actively_looking"]}
                defaultValue={existing?.availability ?? "open_to_opportunities"}
              />
            </div>
            <Text name="headline" label="Headline" defaultValue={existing?.headline ?? ""} placeholder="One professional line." />
            <Select name="intent" label="Looking for" options={INTENTS} defaultValue={existing?.intent ?? "synergy"} />

            <label className="flex items-start gap-2 pt-1 text-[13px] text-ink-muted">
              <input type="checkbox" name="over18" className="mt-0.5" />
              I confirm I am 18 years of age or older.
            </label>
            <label className="flex items-start gap-2 text-[13px] text-ink-muted">
              <input type="checkbox" name="consent" className="mt-0.5" />
              I consent to appearing in candidate sourcing and to receiving
              endorsements from others.
            </label>

            <Button type="submit" className="mt-1">
              Publish profile
            </Button>
          </form>
        </CardSection>
      </Card>
    </div>
  );
}

function Text({
  name,
  label,
  defaultValue,
  placeholder,
  required,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-ink-muted">
      {label}
      <input
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        required={required}
        className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink"
      />
    </label>
  );
}

function Select({
  name,
  label,
  options,
  defaultValue,
}: {
  name: string;
  label: string;
  options: string[];
  defaultValue: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-ink-muted">
      {label}
      <select
        name={name}
        defaultValue={defaultValue}
        className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o.replace(/_/g, " ")}
          </option>
        ))}
      </select>
    </label>
  );
}
