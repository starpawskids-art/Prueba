import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE_NAME,
  createSession,
  findCredentialsByEmail,
  isValidEmail,
  normalizeEmail,
  verifyPassword,
} from "@/lib/auth";

// Switches the browser's identity to the account matching these
// credentials — this is the actual cross-device recovery: log in on a
// new browser/device and you get that account's data (interests, saved,
// comments, follows), not whatever the anonymous session on this browser
// had before. That prior anonymous activity is not merged in; it's simply
// no longer what "you" points to (see README).
export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  if (!body.email || !body.password) {
    return NextResponse.json({ error: "Email y contraseña son requeridos." }, { status: 400 });
  }

  const email = normalizeEmail(body.email);
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Email o contraseña incorrectos." }, { status: 401 });
  }

  const credentials = findCredentialsByEmail(email);
  if (!credentials || !verifyPassword(body.password, credentials.password_hash)) {
    return NextResponse.json({ error: "Email o contraseña incorrectos." }, { status: 401 });
  }

  const { token, expiresAt } = createSession(credentials.user_id);
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });

  return NextResponse.json({ ok: true, email });
}
