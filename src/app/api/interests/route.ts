import { NextResponse } from "next/server";
import { getOrCreateUserId, getUser, setInterests } from "@/lib/user";
import { TOPICS } from "@/lib/types";

export async function POST(request: Request) {
  const userId = await getOrCreateUserId();
  const body = (await request.json()) as { interests?: string[] };
  const interests = (body.interests ?? []).filter((i) => TOPICS.includes(i as (typeof TOPICS)[number]));
  setInterests(userId, interests);
  return NextResponse.json({ ok: true, interests });
}

export async function GET() {
  const userId = await getOrCreateUserId();
  const user = getUser(userId);
  return NextResponse.json({ interests: user?.interests ?? [] });
}
