import { NextResponse } from "next/server";
import db from "@/lib/db";

type ReportRow = { id: string; target_type: string; target_id: string };

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json()) as { action?: "hide" | "dismiss" };

  const report = db.prepare(`SELECT id, target_type, target_id FROM reports WHERE id = ?`).get(id) as
    | ReportRow
    | undefined;
  if (!report) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  if (body.action === "hide") {
    const now = Date.now();
    if (report.target_type === "pulse") {
      db.prepare(`UPDATE pulses SET hidden_at = ? WHERE id = ?`).run(now, report.target_id);
    } else {
      db.prepare(`UPDATE pulse_comments SET hidden_at = ? WHERE id = ?`).run(now, report.target_id);
    }
    db.prepare(`UPDATE reports SET status = 'actioned' WHERE id = ?`).run(id);
  } else {
    db.prepare(`UPDATE reports SET status = 'dismissed' WHERE id = ?`).run(id);
  }

  return NextResponse.json({ ok: true });
}
