import db from "../db";
import { effectiveLanguage, getUser } from "../user";
import { countChangesSince } from "../pipeline/rank";
import { sendToUser, SubscriptionRow } from "./send";
import { CAP_PER_ROLLING_DAY, countSentInWindow, lastSentOfType, logSent } from "./notifications-log";

// "Resumen de tu día" — the product doc's third notification category.
// Fires once daily at a fixed UTC hour (no per-user timezone yet — see
// README). Uses the same 3/24h cap as the other categories, and never
// sends an empty "0 cambios" digest: nothing to report is not
// "justificado" (per the doc's own notification principles).
const DIGEST_HOUR_UTC = Number(process.env.DIGEST_HOUR_UTC ?? 9);
const DIGEST_MIN_GAP_MS = 20 * 60 * 60 * 1000;

export async function dispatchDailyDigest(options: { force?: boolean } = {}): Promise<number> {
  if (!options.force && new Date().getUTCHours() !== DIGEST_HOUR_UTC) return 0;

  const subsAll = db.prepare(`SELECT * FROM push_subscriptions`).all() as SubscriptionRow[];
  if (subsAll.length === 0) return 0;

  const byUser = new Map<string, SubscriptionRow[]>();
  for (const s of subsAll) {
    const list = byUser.get(s.user_id) ?? [];
    list.push(s);
    byUser.set(s.user_id, list);
  }

  let sent = 0;

  for (const [userId, subs] of byUser) {
    if (countSentInWindow(userId) >= CAP_PER_ROLLING_DAY) continue;

    const lastDigest = lastSentOfType(userId, "daily_digest");
    if (lastDigest !== null && Date.now() - lastDigest < DIGEST_MIN_GAP_MS) continue;

    const user = getUser(userId);
    const lang = effectiveLanguage(user);
    const since = lastDigest ?? Date.now() - 24 * 60 * 60 * 1000;
    const count = countChangesSince(since, lang);
    if (count === 0) continue;

    const top = db
      .prepare(`SELECT title FROM pulses WHERE detected_at > ? AND lang = ? ORDER BY momentum DESC LIMIT 1`)
      .get(since, lang) as { title: string } | undefined;

    const title = "Tu resumen de PULSE";
    const body = top
      ? `${count} cambio${count !== 1 ? "s" : ""} relevante${count !== 1 ? "s" : ""} hoy — el más destacado: "${top.title}"`
      : `${count} cambio${count !== 1 ? "s" : ""} relevante${count !== 1 ? "s" : ""} hoy.`;

    await sendToUser(subs, { title, body, url: "/" });
    logSent(userId, null, "daily_digest", title, body);
    sent++;
  }

  return sent;
}
