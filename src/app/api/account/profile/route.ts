import { NextResponse } from "next/server";
import { getOrCreateUserId, getUser, setProfile, setUsername } from "@/lib/user";
import { sanitizeBio, sanitizeUsername } from "@/lib/moderation";

export async function GET() {
  const userId = await getOrCreateUserId();
  const user = getUser(userId);
  return NextResponse.json({
    username: user?.username ?? null,
    displayName: user?.displayName ?? null,
    bio: user?.bio ?? null,
  });
}

export async function POST(request: Request) {
  const userId = await getOrCreateUserId();
  const body = (await request.json()) as {
    username?: string;
    displayName?: string;
    bio?: string;
  };

  if (body.username !== undefined) {
    const result = sanitizeUsername(body.username);
    if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 400 });
    const set = setUsername(userId, result.value);
    if (!set.ok) return NextResponse.json({ error: set.reason }, { status: 409 });
  }

  if (body.bio !== undefined) {
    const result = sanitizeBio(body.bio);
    if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 400 });
    setProfile(userId, { bio: result.value });
  }

  if (body.displayName !== undefined) {
    const trimmed = body.displayName.trim().slice(0, 40);
    setProfile(userId, { displayName: trimmed || null });
  }

  const user = getUser(userId);
  return NextResponse.json({
    ok: true,
    username: user?.username ?? null,
    displayName: user?.displayName ?? null,
    bio: user?.bio ?? null,
  });
}
