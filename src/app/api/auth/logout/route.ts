import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, destroySession } from "@/lib/auth";

export async function POST() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (token) destroySession(token);
  store.delete(SESSION_COOKIE_NAME);
  return NextResponse.json({ ok: true });
}
