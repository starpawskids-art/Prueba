import { NextResponse } from "next/server";
import { effectiveLanguage, getOrCreateUserId, getUser, touchVisit } from "@/lib/user";
import { countChangesSince } from "@/lib/pipeline/rank";

export async function POST() {
  const userId = await getOrCreateUserId();
  const previousVisit = touchVisit(userId);
  const language = effectiveLanguage(getUser(userId));
  const changesSince = countChangesSince(previousVisit, language);
  return NextResponse.json({ changesSince, previousVisit, isFirstVisit: previousVisit === null });
}
