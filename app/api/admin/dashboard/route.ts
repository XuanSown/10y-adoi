import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import { ERROR_CODES } from "@/lib/errors/codes";

export async function GET() {
  const session = await getSession();

  if (!session?.isAdmin) {
    return NextResponse.json(
      { ok: false, code: ERROR_CODES.UNAUTHORIZED, message: "Không có quyền truy cập" },
      { status: 403 }
    );
  }

  const { data: event } = await supabaseAdmin
    .from("events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: candidates } = await supabaseAdmin
    .from("candidates")
    .select("id, name, display_order, vote_count")
    .order("display_order", { ascending: true });

  const { data: voters } = await supabaseAdmin
    .from("voters")
    .select("id, display_name, has_voted, voted_at")
    .neq("display_name", process.env.ADMIN_TRIGGER_NAME ?? "")
    .order("created_at", { ascending: true });

  const total = voters?.length ?? 0;
  const voted = voters?.filter((v) => v.has_voted).length ?? 0;

  return NextResponse.json({
    ok: true,
    data: {
      event,
      candidates,
      voters: voters?.map((v) => ({
        display_name: v.display_name,
        has_voted: v.has_voted,
        voted_at: v.voted_at,
      })),
      stats: {
        total,
        voted,
        notVoted: total - voted,
        completionRate: total > 0 ? Math.round((voted / total) * 100) : 0,
      },
    },
  });
}
