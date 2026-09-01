import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getOrCreateUserId } from "@/lib/user";
import db from "@/lib/db";

type SubscriptionBody = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
};

export async function POST(request: Request) {
  const userId = await getOrCreateUserId();
  const body = (await request.json()) as SubscriptionBody;

  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json({ error: "Suscripción incompleta" }, { status: 400 });
  }

  db.prepare(
    `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth`
  ).run(randomUUID(), userId, body.endpoint, body.keys.p256dh, body.keys.auth, Date.now());

  return NextResponse.json({ ok: true });
}
