import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getOrCreateUserId } from "@/lib/user";
import db from "@/lib/db";

type TargetType = "pulse" | "comment";
const VALID_TARGETS: TargetType[] = ["pulse", "comment"];

// Product doc section 13 ("Moderación, seguridad y confianza"): "Canal
// para reportar errores." No auth beyond the anonymous cookie identity —
// this is a signal-collection endpoint, actual moderation happens in
// /admin (see /api/admin/reports).
export async function POST(request: Request) {
  const userId = await getOrCreateUserId();
  const body = (await request.json()) as { targetType?: string; targetId?: string; reason?: string };

  if (!body.targetType || !VALID_TARGETS.includes(body.targetType as TargetType) || !body.targetId) {
    return NextResponse.json({ error: "targetType y targetId son requeridos" }, { status: 400 });
  }

  const exists =
    body.targetType === "pulse"
      ? db.prepare(`SELECT 1 FROM pulses WHERE id = ?`).get(body.targetId)
      : db.prepare(`SELECT 1 FROM pulse_comments WHERE id = ?`).get(body.targetId);
  if (!exists) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  db.prepare(
    `INSERT INTO reports (id, reporter_user_id, target_type, target_id, reason, created_at, status)
     VALUES (?, ?, ?, ?, ?, ?, 'pending')`
  ).run(randomUUID(), userId, body.targetType, body.targetId, body.reason ?? null, Date.now());

  return NextResponse.json({ ok: true });
}
