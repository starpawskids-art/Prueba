import { NextResponse } from "next/server";
import { runIngestion } from "@/lib/pipeline/run";
import db from "@/lib/db";

// Manual trigger, used by the admin/debug screen — the poller
// (src/lib/pipeline/poller.ts) already runs this automatically every 5
// minutes for the life of the server process.
export async function POST() {
  const result = await runIngestion();
  return NextResponse.json(result);
}

export async function GET() {
  const runs = db
    .prepare(`SELECT * FROM ingest_runs ORDER BY id DESC LIMIT 10`)
    .all();
  const signalCount = (db.prepare(`SELECT COUNT(*) as n FROM signals`).get() as { n: number }).n;
  const pulseCount = (db.prepare(`SELECT COUNT(*) as n FROM pulses`).get() as { n: number }).n;
  return NextResponse.json({ runs, signalCount, pulseCount });
}
