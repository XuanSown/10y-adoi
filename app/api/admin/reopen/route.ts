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

  const body = await req.json().catch(() => ({}));
  const durationMinutes = body.durationMinutes ? Number(body.durationMinutes) : null;
  const endAt = body.endAt ?? null;

  const { error } = await supabaseAdmin.rpc("admin_reopen_voting", {
    p_duration_minutes: durationMinutes,
    p_end_at: endAt,
  });

  if (error) {
    return NextResponse.json(
      { ok: false, code: ERROR_CODES.INTERNAL_ERROR, message: "Không thể mở lại vote" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
