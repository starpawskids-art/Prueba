import { NextResponse } from "next/server";
import { dispatchDailyDigest } from "@/lib/push/digest";

// Debug-only endpoint (used by the /admin panel): forces a daily-digest
// dispatch attempt regardless of the current UTC hour, so the category
// can actually be tested without waiting for DIGEST_HOUR_UTC to come
// around. Still respects the per-user cap and the "already sent
// recently" / "nothing to report" checks — it's a real dispatch, not a
// fake one.
export async function POST() {
  const sent = await dispatchDailyDigest({ force: true });
  return NextResponse.json({ sent });
}
