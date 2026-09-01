import { NextResponse } from "next/server";
import { effectiveLanguage, getOrCreateUserId, getUser, setLanguage } from "@/lib/user";
import { isLanguage } from "@/lib/types";

export async function POST(request: Request) {
  const userId = await getOrCreateUserId();
  const body = (await request.json()) as { language?: string };
  if (!body.language || !isLanguage(body.language)) {
    return NextResponse.json({ error: "Idioma no soportado" }, { status: 400 });
  }
  setLanguage(userId, body.language);
  return NextResponse.json({ ok: true, language: body.language });
}

export async function GET() {
  const userId = await getOrCreateUserId();
  return NextResponse.json({ language: effectiveLanguage(getUser(userId)) });
}
