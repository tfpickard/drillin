import type {
  DeckFilters,
  IntegrityLedger,
  Profile,
  ProfileTag,
} from "@/lib/types";
import { severityFromRatio } from "@/lib/ledger";
import { getServerSupabase } from "@/lib/supabase/server";

/**
 * Live, Supabase-backed read layer. Mirrors the seed layer's async interface
 * (src/lib/data/index.ts dispatches between them). Tags and the integrity
 * ledger come exclusively from the SECURITY DEFINER RPCs, so endorser identity
 * never reaches this process.
 *
 * Until M1 auth lands, reads run as the anon role: there is no logged-in
 * viewer, so the mutual-connection leak is 0 and pending tags stay hidden.
 * Both light up once a real session exists.
 */

const PROFILE_SELECT =
  "id,display_name,campus,location,seniority,headline,availability,intent,intent_line,avatar_hue,companies(name),roles(name)";

interface ProfileRow {
  id: string;
  display_name: string;
  campus: string | null;
  location: string | null;
  seniority: Profile["seniority"];
  headline: string;
  availability: Profile["availability"];
  intent: Profile["intent"];
  intent_line: string;
  avatar_hue: number;
  companies: { name: string } | null;
  roles: { name: string } | null;
}

async function client() {
  const supabase = await getServerSupabase();
  if (!supabase) throw new Error("Supabase env missing in live mode");
  return supabase;
}

async function assemble(row: ProfileRow): Promise<Profile> {
  const supabase = await client();
  const [tagsRes, ledgerRes] = await Promise.all([
    supabase.rpc("get_profile_tags", { p_subject: row.id, p_viewer: null }),
    supabase.rpc("get_integrity_ledger", { p_subject: row.id }),
  ]);

  const tags: ProfileTag[] = (tagsRes.data ?? []).map(
    (t: {
      label: string;
      tier: ProfileTag["tier"];
      category: ProfileTag["category"];
      count: number;
      mutual: number;
      pending: boolean;
    }) => ({
      label: t.label,
      tier: t.tier,
      category: t.category,
      count: t.count,
      mutual: t.mutual,
      pending: t.pending,
    }),
  );

  const l = ledgerRes.data?.[0] as
    | {
        hidden_30d: number;
        declined_30d: number;
        self_ratio: number;
        peer_retention: number;
      }
    | undefined;

  const selfRatio = Number(l?.self_ratio ?? 0);
  const ledger: IntegrityLedger = {
    hidden30d: l?.hidden_30d ?? 0,
    declined30d: l?.declined_30d ?? 0,
    selfRatio,
    selfRatioSeverity: severityFromRatio(selfRatio),
    peerRetention: Number(l?.peer_retention ?? 1),
  };

  return {
    id: row.id,
    displayName: row.display_name,
    role: row.roles?.name ?? "",
    company: row.companies?.name ?? "",
    campus: row.campus ?? "",
    location: row.location ?? "",
    seniority: row.seniority,
    headline: row.headline,
    availability: row.availability,
    intent: row.intent,
    intentLine: row.intent_line,
    avatarHue: row.avatar_hue,
    tags,
    ledger,
    degree: null, // computed from the match graph once a viewer session exists
  };
}

export async function getDeckLive(filters: DeckFilters = {}): Promise<Profile[]> {
  const supabase = await client();
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("consents_to_listing", true);
  if (error) throw error;

  const rows = (data ?? []) as unknown as ProfileRow[];
  const profiles = await Promise.all(rows.map(assemble));
  return profiles.filter((p) => {
    if (filters.company && p.company !== filters.company) return false;
    if (filters.role && p.role !== filters.role) return false;
    if (filters.campus && p.campus !== filters.campus) return false;
    if (filters.seniority && p.seniority !== filters.seniority) return false;
    return true;
  });
}

export async function getProfileLive(id: string): Promise<Profile | null> {
  const supabase = await client();
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return assemble(data as unknown as ProfileRow);
}

export async function getFacetsLive() {
  const profiles = await getDeckLive();
  return {
    company: unique(profiles.map((p) => p.company)),
    role: unique(profiles.map((p) => p.role)),
    campus: unique(profiles.map((p) => p.campus)),
  };
}

function unique(xs: string[]): string[] {
  return [...new Set(xs.filter(Boolean))].sort();
}
