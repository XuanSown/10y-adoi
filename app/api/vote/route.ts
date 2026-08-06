import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { validateCandidateId } from "@/lib/validation/schemas";
import { getSession } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import { ERROR_CODES } from "@/lib/errors/codes";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { ok: false, code: ERROR_CODES.UNAUTHORIZED, message: "Vui lòng đăng nhập" },
        { status: 401 }
      );
    }

    if (session.isAdmin) {
      return NextResponse.json(
        { ok: false, code: ERROR_CODES.UNAUTHORIZED, message: "Admin không thể vote" },
        { status: 403 }
      );
    }

    const voterLimit = rateLimit(`vote:voter:${session.voterId}`, 3, 10_000);
    if (!voterLimit.allowed) {
      return NextResponse.json(
        { ok: false, code: ERROR_CODES.RATE_LIMITED, message: "Quá nhiều yêu cầu" },
        { status: 429 }
      );
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const ipLimit = rateLimit("vote:ip:" + ip, 100, 60_000);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { ok: false, code: ERROR_CODES.RATE_LIMITED, message: "Quá nhiều yêu cầu từ IP này" },
        { status: 429 }
      );
    }

    const body = await req.json();
    const candidateId = validateCandidateId(body.candidateId);
    const idempotencyKey = body.idempotencyKey ?? crypto.randomUUID();

    const { data, error } = await supabaseAdmin.rpc("cast_vote", {
      p_voter_id: session.voterId,
      p_candidate_id: candidateId,
      p_idempotency_key: idempotencyKey,
    });

    if (error) {
      return NextResponse.json(
        { ok: false, code: ERROR_CODES.INTERNAL_ERROR, message: "Lỗi khi bình chọn" },
        { status: 500 }
      );
    }

    const result = data as { ok: boolean; code: string | null; message: string };

    if (!result.ok) {
      const statusCode = result.code === "ALREADY_VOTED" ? 409
        : result.code === "VOTING_CLOSED" ? 403
        : result.code === "UNAUTHORIZED" ? 401
        : 400;
      return NextResponse.json({ ok: false, code: result.code, message: result.message }, { status: statusCode });
    }

    return NextResponse.json({ ok: true, message: result.message });
  } catch (err) {
    if (err && typeof err === "object" && "code" in err) {
      const e = err as { code: string; message: string; statusCode: number };
      return NextResponse.json({ ok: false, code: e.code, message: e.message }, { status: e.statusCode });
    }
    return NextResponse.json(
      { ok: false, code: ERROR_CODES.INTERNAL_ERROR, message: "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}
