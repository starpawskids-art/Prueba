import { NextResponse } from "next/server";
import { getOrCreateUserId, touchVisit } from "@/lib/user";
import { countChangesSince } from "@/lib/pipeline/rank";

export async function POST() {
  const userId = await getOrCreateUserId();
  const previousVisit = touchVisit(userId);
  const changesSince = countChangesSince(previousVisit);
  return NextResponse.json({ changesSince, previousVisit, isFirstVisit: previousVisit === null });
}
