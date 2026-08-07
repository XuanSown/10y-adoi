import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import { ERROR_CODES } from "@/lib/errors/codes";

const CONFIRMATION_PHRASE = "RESET_VOTES";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json(
      { ok: false, code: ERROR_CODES.UNAUTHORIZED, message: "Không có quyền truy cập" },
      { status: 403 }
    );
  }

  const body = await req.json();
  if (body.confirmation !== CONFIRMATION_PHRASE) {
    return NextResponse.json(
      { ok: false, code: ERROR_CODES.INVALID_INPUT, message: `Cần nhập "${CONFIRMATION_PHRASE}" để xác nhận` },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin.rpc("admin_reset_votes");
  if (error) {
    console.error("admin_reset_votes error:", error);
    return NextResponse.json(
      { ok: false, code: ERROR_CODES.INTERNAL_ERROR, message: `Không thể reset votes: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
