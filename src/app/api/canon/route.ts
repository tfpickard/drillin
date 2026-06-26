import { NextResponse, type NextRequest } from "next/server";
import { isSeedMode, searchCanon } from "@/lib/data";
import { getServerSupabase } from "@/lib/supabase/server";

/** Canon tag autocomplete. Live mode queries canon_tags; seed mode uses the
 * in-memory list. Returns [{ id, label, category }]. */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);

  if (isSeedMode()) {
    return NextResponse.json(searchCanon(q));
  }

  const supabase = await getServerSupabase();
  if (!supabase) return NextResponse.json([]);

  const { data, error } = await supabase
    .from("canon_tags")
    .select("id,label,category")
    .ilike("label", `%${q}%`)
    .order("label")
    .limit(8);
  if (error) return NextResponse.json([], { status: 500 });
  return NextResponse.json(data ?? []);
}
