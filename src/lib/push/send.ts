import webpush, { PushSubscription, WebPushError } from "web-push";
import db from "../db";

let configured = false;

function ensureConfigured() {
  if (configured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export type SubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type PushPayload = { title: string; body: string; url?: string };

// Sends to every subscription for a user, pruning any the push service
// reports as gone (404/410 — the browser dropped it, uninstalled, etc.).
export async function sendToUser(subs: SubscriptionRow[], payload: PushPayload): Promise<void> {
  if (!ensureConfigured()) {
    console.warn("[pulse] push not configured (missing VAPID_* env vars) — skipping send");
    return;
  }

  await Promise.all(
    subs.map(async (sub) => {
      const subscription: PushSubscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };
      try {
        await webpush.sendNotification(subscription, JSON.stringify(payload));
      } catch (err) {
        const statusCode = err instanceof WebPushError ? err.statusCode : null;
        if (statusCode === 404 || statusCode === 410) {
          db.prepare(`DELETE FROM push_subscriptions WHERE id = ?`).run(sub.id);
        } else {
          console.error(`[pulse] push send failed for subscription ${sub.id}:`, err);
        }
      }
    })
  );
}

export function isPushConfigured(): boolean {
  return ensureConfigured();
}
