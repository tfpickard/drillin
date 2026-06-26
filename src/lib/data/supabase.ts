import type {
  ChatThread,
  DeckFilters,
  IntegrityLedger,
  MatchSummary,
  MyEndorsement,
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
 * The viewer is the authenticated user (or null when browsing signed-out): the
 * mutual-connection leak and pending-tag preview key off it.
 */

type Supabase = NonNullable<Awaited<ReturnType<typeof getServerSupabase>>>;

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

async function getClient(): Promise<Supabase> {
  const supabase = await getServerSupabase();
  if (!supabase) throw new Error("Supabase env missing in live mode");
  return supabase;
}

async function currentUserId(supabase: Supabase): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function assemble(
  supabase: Supabase,
  row: ProfileRow,
  viewerId: string | null,
): Promise<Profile> {
  const [tagsRes, ledgerRes] = await Promise.all([
    supabase.rpc("get_profile_tags", { p_subject: row.id, p_viewer: viewerId }),
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
    | { hidden_30d: number; declined_30d: number; self_ratio: number; peer_retention: number }
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
    degree: null, // computed from the match graph once degree lookup lands
  };
}

export async function getDeckLive(filters: DeckFilters = {}): Promise<Profile[]> {
  const supabase = await getClient();
  const viewerId = await currentUserId(supabase);

  let query = supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("consents_to_listing", true);
  if (viewerId) query = query.neq("id", viewerId); // don't source yourself

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as unknown as ProfileRow[];
  const profiles = await Promise.all(rows.map((r) => assemble(supabase, r, viewerId)));
  return profiles.filter((p) => {
    if (filters.company && p.company !== filters.company) return false;
    if (filters.role && p.role !== filters.role) return false;
    if (filters.campus && p.campus !== filters.campus) return false;
    if (filters.seniority && p.seniority !== filters.seniority) return false;
    return true;
  });
}

export async function getProfileLive(id: string): Promise<Profile | null> {
  const supabase = await getClient();
  const viewerId = await currentUserId(supabase);
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return assemble(supabase, data as unknown as ProfileRow, viewerId);
}

export async function getViewerLive(): Promise<Profile | null> {
  const supabase = await getClient();
  const viewerId = await currentUserId(supabase);
  if (!viewerId) return null;
  return getProfileLive(viewerId);
}

export async function getMyEndorsementsLive(): Promise<MyEndorsement[]> {
  const supabase = await getClient();
  const { data, error } = await supabase.rpc("get_my_endorsements");
  if (error) throw error;
  return (data ?? []).map(
    (r: {
      id: string;
      label: string;
      tier: MyEndorsement["tier"];
      kind: MyEndorsement["kind"];
      category: MyEndorsement["category"];
      status: MyEndorsement["status"];
    }) => ({
      id: r.id,
      label: r.label,
      tier: r.tier,
      kind: r.kind,
      category: r.category,
      status: r.status,
    }),
  );
}

export async function getMatchesLive(): Promise<MatchSummary[]> {
  const supabase = await getClient();
  const me = await currentUserId(supabase);
  if (!me) return [];

  const { data: ms } = await supabase
    .from("matches")
    .select("id,user_a,user_b,created_at")
    .or(`user_a.eq.${me},user_b.eq.${me}`)
    .order("created_at", { ascending: false });
  const matches = ms ?? [];
  if (matches.length === 0) return [];

  const otherIds = matches.map((m) => (m.user_a === me ? m.user_b : m.user_a));
  const [{ data: profs }, { data: convs }] = await Promise.all([
    supabase.from("profiles").select("id,display_name,avatar_hue").in("id", otherIds),
    supabase.from("conversations").select("id,match_id").in("match_id", matches.map((m) => m.id)),
  ]);

  const profById = new Map((profs ?? []).map((p) => [p.id, p]));
  const convByMatch = new Map((convs ?? []).map((c) => [c.match_id, c.id]));

  return matches.map((m) => {
    const otherId = m.user_a === me ? m.user_b : m.user_a;
    const p = profById.get(otherId);
    return {
      matchId: m.id,
      conversationId: convByMatch.get(m.id) ?? null,
      otherId,
      otherName: p?.display_name ?? "A connection",
      otherHue: p?.avatar_hue ?? 210,
    };
  });
}

export async function getConversationLive(matchId: string): Promise<ChatThread | null> {
  const supabase = await getClient();
  const me = await currentUserId(supabase);
  if (!me) return null;

  // RLS limits this to matches you're in.
  const { data: match } = await supabase
    .from("matches")
    .select("id,user_a,user_b")
    .eq("id", matchId)
    .maybeSingle();
  if (!match) return null;

  const { data: conv } = await supabase
    .from("conversations")
    .select("id")
    .eq("match_id", matchId)
    .maybeSingle();
  if (!conv) return null;

  const otherId = match.user_a === me ? match.user_b : match.user_a;
  const [{ data: other }, { data: msgs }] = await Promise.all([
    supabase.from("profiles").select("display_name,avatar_hue").eq("id", otherId).maybeSingle(),
    supabase
      .from("messages")
      .select("id,sender_id,body,created_at")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true }),
  ]);

  return {
    conversationId: conv.id,
    meId: me,
    otherName: other?.display_name ?? "A connection",
    otherHue: other?.avatar_hue ?? 210,
    messages: (msgs ?? []).map((m) => ({
      id: m.id,
      senderId: m.sender_id,
      body: m.body,
      createdAt: m.created_at,
    })),
  };
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
