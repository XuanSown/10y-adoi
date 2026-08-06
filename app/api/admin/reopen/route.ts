import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import { ERROR_CODES } from "@/lib/errors/codes";

export async function POST() {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json(
      { ok: false, code: ERROR_CODES.UNAUTHORIZED, message: "Không có quyền truy cập" },
      { status: 403 }
    );
  }

  const { error } = await supabaseAdmin.rpc("admin_reopen_voting");
  if (error) {
    return NextResponse.json(
      { ok: false, code: ERROR_CODES.INTERNAL_ERROR, message: "Không thể mở lại vote" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
