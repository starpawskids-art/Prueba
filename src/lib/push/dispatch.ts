import { randomUUID } from "node:crypto";
import db from "../db";
import { effectiveLanguage, getUser } from "../user";
import { sendToUser, SubscriptionRow } from "./send";

// Per the product doc's notification principles: scarce, justified, and
// capped — "1-3 pushes/día por usuario". We use a rolling 24h window
// rather than a calendar day to sidestep timezone bookkeeping.
const CAP_PER_ROLLING_DAY = 3;
const ROLLING_WINDOW_MS = 24 * 60 * 60 * 1000;
const EXCEPTIONAL_MOMENTUM_THRESHOLD = 0.85;

type PulseRow = {
  id: string;
  title: string;
  change_text: string;
  topic: string;
  momentum: number;
  detected_at: number;
  updated_at: number;
  lang: string;
};

function countSentInWindow(userId: string): number {
  const since = Date.now() - ROLLING_WINDOW_MS;
  const row = db
    .prepare(`SELECT COUNT(*) as n FROM notifications_sent WHERE user_id = ? AND sent_at >= ?`)
    .get(userId, since) as { n: number };
  return row.n;
}

function logSent(userId: string, pulseId: string, type: string, title: string, body: string) {
  db.prepare(
    `INSERT INTO notifications_sent (id, user_id, pulse_id, type, title, body, sent_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(randomUUID(), userId, pulseId, type, title, body, Date.now());
}

// Called once after each ingestion run finishes. Only looks at pulses this
// exact run touched (updated_at === runTimestamp, which every upsert in
// that run was stamped with) — not the whole table.
export async function dispatchNotifications(runTimestamp: number): Promise<number> {
  const updated = db.prepare(`SELECT * FROM pulses WHERE updated_at = ?`).all(runTimestamp) as PulseRow[];
  if (updated.length === 0) return 0;

  const momenta = updated.map((p) => p.momentum);
  const min = Math.min(...momenta);
  const max = Math.max(...momenta);
  const momentum01 = (p: PulseRow) => (max === min ? 0 : (p.momentum - min) / (max - min));

  const subsAll = db.prepare(`SELECT * FROM push_subscriptions`).all() as SubscriptionRow[];
  if (subsAll.length === 0) return 0;

  const byUser = new Map<string, SubscriptionRow[]>();
  for (const s of subsAll) {
    const list = byUser.get(s.user_id) ?? [];
    list.push(s);
    byUser.set(s.user_id, list);
  }

  let notificationsSent = 0;

  for (const [userId, subs] of byUser) {
    let sentCount = countSentInWindow(userId);
    if (sentCount >= CAP_PER_ROLLING_DAY) continue;

    const user = getUser(userId);
    const lang = effectiveLanguage(user);
    const interests = user?.interests ?? [];

    // Category 1 ("algo que sigues cambió"): a pulse this user follows
    // just got a fresh update — excludes pulses that are themselves brand
    // new this run (detected_at === updated_at), since following implies
    // it already existed.
    const followedIds = new Set(
      (
        db
          .prepare(`SELECT DISTINCT pulse_id FROM interactions WHERE user_id = ? AND type = 'follow'`)
          .all(userId) as Array<{ pulse_id: string }>
      ).map((r) => r.pulse_id)
    );

    const followedChanged = updated.filter(
      (p) => followedIds.has(p.id) && p.lang === lang && p.detected_at !== p.updated_at
    );

    for (const p of followedChanged) {
      if (sentCount >= CAP_PER_ROLLING_DAY) break;
      const title = "PULSE";
      const body = `El tema que sigues acaba de cambiar: ${p.change_text}`;
      await sendToUser(subs, { title, body, url: `/pulse/${p.id}` });
      logSent(userId, p.id, "followed_change", title, body);
      sentCount++;
      notificationsSent++;
    }

    // Category 2 ("tendencia excepcional"): a new pulse in one of this
    // user's interests with momentum far above its peers in this run.
    if (sentCount < CAP_PER_ROLLING_DAY && interests.length > 0) {
      const exceptional = updated.find(
        (p) =>
          p.lang === lang &&
          interests.includes(p.topic) &&
          momentum01(p) >= EXCEPTIONAL_MOMENTUM_THRESHOLD &&
          !followedChanged.some((f) => f.id === p.id)
      );
      if (exceptional) {
        const title = "Tendencia excepcional";
        const body = exceptional.title;
        await sendToUser(subs, { title, body, url: `/pulse/${exceptional.id}` });
        logSent(userId, exceptional.id, "exceptional_trend", title, body);
        notificationsSent++;
      }
    }
  }

  return notificationsSent;
}

// "Resumen de tu día" (daily digest) from the product doc's notification
// categories is NOT implemented — it needs a once-a-day scheduled trigger
// at a sensible local hour, which this 5-minute poller isn't suited for.
// See README.
