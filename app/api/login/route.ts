import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { validateDisplayName } from "@/lib/validation/schemas";
import { hashToken, setSessionCookie } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import { ERROR_CODES, ApiError } from "@/lib/errors/codes";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

    const ipLimit = rateLimit("login:ip:" + ip, 100, 60_000);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { ok: false, code: ERROR_CODES.RATE_LIMITED, message: "Quá nhiều yêu cầu, vui lòng thử lại sau" },
        { status: 429 }
      );
    }

    const body = await req.json();
    const displayName = validateDisplayName(body.displayName);

    const token = crypto.randomUUID();
    const tokenHash = hashToken(token);
    const isAdmin = displayName === (process.env.ADMIN_TRIGGER_NAME ?? "");

    const { data: event } = await supabaseAdmin
      .from("events")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { error } = await supabaseAdmin.from("voters").insert({
      event_id: event?.id ?? null,
      display_name: displayName,
      session_token_hash: tokenHash,
      has_voted: false,
      event_version: 1,
    });

    if (error) {
      return NextResponse.json(
        { ok: false, code: ERROR_CODES.INTERNAL_ERROR, message: "Không thể tạo session" },
        { status: 500 }
      );
    }

    await setSessionCookie(token, isAdmin);

    return NextResponse.json({
      ok: true,
      isAdmin,
      redirectTo: isAdmin ? "/admin" : "/vote",
    });
  } catch (err) {
    if (err instanceof ApiError || (err && typeof err === "object" && "code" in err)) {
      const e = err as { code: string; message: string; statusCode: number };
      return NextResponse.json({ ok: false, code: e.code, message: e.message }, { status: e.statusCode });
    }
    return NextResponse.json(
      { ok: false, code: ERROR_CODES.INTERNAL_ERROR, message: "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}
