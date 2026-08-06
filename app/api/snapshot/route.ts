import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  const session = await getSession();

  const { data } = await supabaseAdmin.rpc("get_snapshot", {
    p_voter_id: session?.voterId ?? null,
  });

  return NextResponse.json({
    ok: true,
    data,
  });
}
