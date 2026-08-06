import "server-only";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/server";
import { ERROR_CODES } from "@/lib/errors/codes";

const VOTE_COOKIE = "vote_session";
const ADMIN_COOKIE = "admin_session";

export type SessionData = {
  voterId: string;
  displayName: string;
  isAdmin: boolean;
};

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const voteCookie = cookieStore.get(VOTE_COOKIE)?.value;
  const adminCookie = cookieStore.get(ADMIN_COOKIE)?.value;

  if (adminCookie) {
    const { data } = await supabaseAdmin
      .from("voters")
      .select("id, display_name")
      .eq("session_token_hash", hashToken(adminCookie))
      .eq("display_name", process.env.ADMIN_TRIGGER_NAME ?? "")
      .maybeSingle();

    if (data) {
      return { voterId: data.id, displayName: data.display_name, isAdmin: true };
    }
  }

  if (voteCookie) {
    const { data } = await supabaseAdmin
      .from("voters")
      .select("id, display_name")
      .eq("session_token_hash", hashToken(voteCookie))
      .maybeSingle();

    if (data) {
      return { voterId: data.id, displayName: data.display_name, isAdmin: false };
    }
  }

  return null;
}

export async function createVoterSession(displayName: string): Promise<string> {
  const token = crypto.randomUUID();
  const tokenHash = hashToken(token);

  const { error } = await supabaseAdmin.from("voters").insert({
    display_name: displayName,
    session_token_hash: tokenHash,
    has_voted: false,
    event_version: 1,
  });

  if (error) {
    throw { code: ERROR_CODES.INTERNAL_ERROR, message: "Không thể tạo session", statusCode: 500 };
  }

  return token;
}

export function hashToken(token: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(token + (process.env.RATE_LIMIT_SALT ?? ""));
  return Array.from(new Uint8Array(data))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function setSessionCookie(token: string, isAdmin: boolean): Promise<void> {
  const cookieStore = await cookies();
  const cookieName = isAdmin ? ADMIN_COOKIE : VOTE_COOKIE;

  cookieStore.set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

export { VOTE_COOKIE, ADMIN_COOKIE };
