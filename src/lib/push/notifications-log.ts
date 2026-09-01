import { randomUUID } from "node:crypto";
import db from "../db";

// Per the product doc's notification principles: scarce, justified, and
// capped — "1-3 pushes/día por usuario", shared across every category
// (followed_change, exceptional_trend, daily_digest). A rolling 24h
// window sidesteps calendar/timezone bookkeeping.
export const CAP_PER_ROLLING_DAY = 3;
export const ROLLING_WINDOW_MS = 24 * 60 * 60 * 1000;

export function countSentInWindow(userId: string): number {
  const since = Date.now() - ROLLING_WINDOW_MS;
  const row = db
    .prepare(`SELECT COUNT(*) as n FROM notifications_sent WHERE user_id = ? AND sent_at >= ?`)
    .get(userId, since) as { n: number };
  return row.n;
}

export function logSent(userId: string, pulseId: string | null, type: string, title: string, body: string) {
  db.prepare(
    `INSERT INTO notifications_sent (id, user_id, pulse_id, type, title, body, sent_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(randomUUID(), userId, pulseId, type, title, body, Date.now());
}

export function lastSentOfType(userId: string, type: string): number | null {
  const row = db
    .prepare(
      `SELECT sent_at FROM notifications_sent WHERE user_id = ? AND type = ? ORDER BY sent_at DESC LIMIT 1`
    )
    .get(userId, type) as { sent_at: number } | undefined;
  return row?.sent_at ?? null;
}
