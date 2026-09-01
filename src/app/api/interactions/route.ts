import { NextResponse } from "next/server";
import { getOrCreateUserId } from "@/lib/user";
import db from "@/lib/db";
import { InteractionType } from "@/lib/types";

const VALID_TYPES: InteractionType[] = ["open", "save", "follow", "dismiss", "more", "less"];

export async function POST(request: Request) {
  const userId = await getOrCreateUserId();
  const body = (await request.json()) as { pulseId?: string; type?: string };

  if (!body.pulseId || !body.type || !VALID_TYPES.includes(body.type as InteractionType)) {
    return NextResponse.json({ error: "pulseId y type válido son requeridos" }, { status: 400 });
  }

  const pulse = db.prepare(`SELECT topic FROM pulses WHERE id = ?`).get(body.pulseId) as
    | { topic: string }
    | undefined;
  if (!pulse) {
    return NextResponse.json({ error: "Pulse no encontrada" }, { status: 404 });
  }

  db.prepare(
    `INSERT INTO interactions (user_id, pulse_id, type, topic, created_at) VALUES (?, ?, ?, ?, ?)`
  ).run(userId, body.pulseId, body.type, pulse.topic, Date.now());

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const userId = await getOrCreateUserId();
  const rows = db
    .prepare(
      `SELECT i.type, i.created_at, p.id, p.title, p.topic, p.change_text, p.why_it_matters, p.confidence, p.sources_json, p.detected_at, p.updated_at, p.momentum
       FROM interactions i JOIN pulses p ON p.id = i.pulse_id
       WHERE i.user_id = ? AND i.type IN ('save','follow')
       ORDER BY i.created_at DESC`
    )
    .all(userId) as Array<{
    type: string;
    created_at: number;
    id: string;
    title: string;
    topic: string;
    change_text: string;
    why_it_matters: string;
    confidence: string;
    sources_json: string;
    detected_at: number;
    updated_at: number;
    momentum: number;
  }>;

  const dedupeById = (list: typeof rows) => {
    const seen = new Set<string>();
    const result: ReturnType<typeof toPulseJson>[] = [];
    for (const r of list) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      result.push(toPulseJson(r));
    }
    return result;
  };

  const saved = dedupeById(rows.filter((r) => r.type === "save"));
  const following = dedupeById(rows.filter((r) => r.type === "follow"));

  return NextResponse.json({ saved, following });
}

function toPulseJson(r: {
  id: string;
  title: string;
  topic: string;
  change_text: string;
  why_it_matters: string;
  confidence: string;
  sources_json: string;
  detected_at: number;
  updated_at: number;
  momentum: number;
}) {
  return {
    id: r.id,
    title: r.title,
    topic: r.topic,
    changeText: r.change_text,
    whyItMatters: r.why_it_matters,
    confidence: r.confidence,
    sources: JSON.parse(r.sources_json),
    detectedAt: r.detected_at,
    updatedAt: r.updated_at,
    momentum: r.momentum,
    noveltyMinutes: Math.round(Math.max(0, (Date.now() - r.detected_at) / 60000)),
    score: r.momentum,
  };
}
