import { NextResponse } from "next/server";
import { computeOverview, computeRetention } from "@/lib/analytics/retention";

// Debug-only endpoint (no auth — matches the rest of /admin, which is a
// local debug panel, not a gated production surface).
export async function GET() {
  return NextResponse.json({
    overview: computeOverview(),
    retention: computeRetention(),
  });
}
