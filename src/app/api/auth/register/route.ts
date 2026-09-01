import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getOrCreateUserId } from "@/lib/user";
import {
  SESSION_COOKIE_NAME,
  attachCredentials,
  createSession,
  findCredentialsByEmail,
  hasCredentials,
  isValidEmail,
  isValidPassword,
  normalizeEmail,
} from "@/lib/auth";

// Attaches email+password credentials to the CURRENT identity (anonymous
// or authenticated) rather than creating a brand-new user row — this is
// what makes "signing up" preserve everything you already did anonymously
// (interests, saved Pulses, comments): it's the same row, now with a
// login attached. See README for what this auth does *not* do yet (email
// verification, password reset — both need an email-sending service).
export async function POST(request: Request) {
  const userId = await getOrCreateUserId();
  const body = (await request.json()) as { email?: string; password?: string };

  if (!body.email || !body.password) {
    return NextResponse.json({ error: "Email y contraseña son requeridos." }, { status: 400 });
  }

  const email = normalizeEmail(body.email);
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Ese email no parece válido." }, { status: 400 });
  }
  if (!isValidPassword(body.password)) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres." }, { status: 400 });
  }
  if (hasCredentials(userId)) {
    return NextResponse.json({ error: "Esta sesión ya tiene una cuenta con contraseña." }, { status: 409 });
  }
  if (findCredentialsByEmail(email)) {
    return NextResponse.json({ error: "Ya existe una cuenta con ese email." }, { status: 409 });
  }

  attachCredentials(userId, email, body.password);
  const { token, expiresAt } = createSession(userId);

  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });

  return NextResponse.json({ ok: true, email });
}
