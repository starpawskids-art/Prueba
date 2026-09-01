import { NextResponse } from "next/server";
import { getOrCreateUserId } from "@/lib/user";
import { getActivityFromFollowedUsers, getFollowingUsers } from "@/lib/social/follows";

export async function GET() {
  const userId = await getOrCreateUserId();
  return NextResponse.json({
    activity: getActivityFromFollowedUsers(userId),
    people: getFollowingUsers(userId),
  });
}
