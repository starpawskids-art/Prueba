import { NextResponse } from "next/server";
import db from "@/lib/db";

type ReportRow = {
  id: string;
  target_type: string;
  target_id: string;
  reason: string | null;
  created_at: number;
  status: string;
};

export async function GET() {
  const reports = db
    .prepare(`SELECT * FROM reports WHERE status = 'pending' ORDER BY created_at DESC LIMIT 50`)
    .all() as ReportRow[];

  const enriched = reports.map((r) => {
    if (r.target_type === "pulse") {
      const pulse = db.prepare(`SELECT title, hidden_at FROM pulses WHERE id = ?`).get(r.target_id) as
        | { title: string; hidden_at: number | null }
        | undefined;
      return { ...r, targetPreview: pulse?.title ?? "(Pulse eliminada)", alreadyHidden: !!pulse?.hidden_at };
    }
    const comment = db
      .prepare(`SELECT body, hidden_at FROM pulse_comments WHERE id = ?`)
      .get(r.target_id) as { body: string; hidden_at: number | null } | undefined;
    return { ...r, targetPreview: comment?.body ?? "(comentario eliminado)", alreadyHidden: !!comment?.hidden_at };
  });

  return NextResponse.json({ reports: enriched });
}
