import { NextResponse } from "next/server";
import { getOrCreateUserId } from "@/lib/user";
import { followUser, unfollowUser } from "@/lib/social/follows";
import { notifyNewFollower } from "@/lib/push/social";

export async function POST(request: Request) {
  const followerId = await getOrCreateUserId();
  const body = (await request.json()) as { targetUserId?: string };
  if (!body.targetUserId) {
    return NextResponse.json({ error: "targetUserId requerido" }, { status: 400 });
  }

  const result = followUser(followerId, body.targetUserId);
  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 400 });

  notifyNewFollower(followerId, body.targetUserId).catch((err) =>
    console.error("[pulse] new-follower notification failed", err)
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const followerId = await getOrCreateUserId();
  const body = (await request.json()) as { targetUserId?: string };
  if (!body.targetUserId) {
    return NextResponse.json({ error: "targetUserId requerido" }, { status: 400 });
  }
  unfollowUser(followerId, body.targetUserId);
  return NextResponse.json({ ok: true });
}
