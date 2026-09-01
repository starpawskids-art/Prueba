import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function POST(request: Request) {
  const body = (await request.json()) as { endpoint?: string };
  if (!body.endpoint) {
    return NextResponse.json({ error: "endpoint requerido" }, { status: 400 });
  }
  db.prepare(`DELETE FROM push_subscriptions WHERE endpoint = ?`).run(body.endpoint);
  return NextResponse.json({ ok: true });
}
