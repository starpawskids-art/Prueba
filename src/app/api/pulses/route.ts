import { NextResponse } from "next/server";
import { getOrCreateUserId } from "@/lib/user";
import { getFeed } from "@/lib/pipeline/rank";

export async function GET(request: Request) {
  const userId = await getOrCreateUserId();
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? 10);
  const pulses = getFeed(userId, Number.isFinite(limit) ? limit : 10);
  return NextResponse.json({ pulses });
}
