import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  const session = await getSession();

  // Check if voting time has expired and auto-lock
  const { data: event } = await supabaseAdmin
    .from("events")
    .select("id, status, end_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (
    event &&
    event.status === "voting" &&
    event.end_at &&
    new Date(event.end_at).getTime() <= Date.now()
  ) {
    // Auto-lock: time has expired
    await supabaseAdmin.rpc("admin_lock_voting");
  }

  const { data } = await supabaseAdmin.rpc("get_snapshot", {
    p_voter_id: session?.voterId ?? null,
  });

  return NextResponse.json({
    ok: true,
    data,
  });
}
