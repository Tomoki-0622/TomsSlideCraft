import { NextRequest, NextResponse } from "next/server";
import { checkPassword, generateSessionToken, setSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  if (!checkPassword(password)) {
    return NextResponse.json({ error: "パスワードが正しくありません" }, { status: 401 });
  }

  const token = await generateSessionToken();
  await setSessionCookie(token);
  return NextResponse.json({ ok: true });
}
