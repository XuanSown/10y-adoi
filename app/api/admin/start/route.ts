import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import { ERROR_CODES } from "@/lib/errors/codes";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json(
      { ok: false, code: ERROR_CODES.UNAUTHORIZED, message: "Không có quyền truy cập" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const durationMinutes = body.durationMinutes ?? null;
  const endAt = body.endAt ?? null;

  const { data, error } = await supabaseAdmin.rpc("admin_start_voting", {
    p_duration_minutes: durationMinutes,
    p_end_at: endAt,
  });

  if (error || !(data as { ok: boolean }).ok) {
    return NextResponse.json(
      { ok: false, code: ERROR_CODES.INTERNAL_ERROR, message: "Không thể bắt đầu vote" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
