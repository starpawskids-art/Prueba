import db from "../db";
import { getUser, publicName } from "../user";
import { sendToUser, SubscriptionRow } from "./send";
import { CAP_PER_ROLLING_DAY, countSentInWindow, logSent } from "./notifications-log";

// A social-graph notification, beyond the product doc's original three
// categories (that spec predates PULSE having any social graph at all) —
// still capped by the exact same shared 3/24h budget, never a separate
// allowance layered on top.
export async function notifyNewFollower(followerId: string, followeeId: string): Promise<void> {
  if (countSentInWindow(followeeId) >= CAP_PER_ROLLING_DAY) return;

  const subs = db
    .prepare(`SELECT * FROM push_subscriptions WHERE user_id = ?`)
    .all(followeeId) as SubscriptionRow[];
  if (subs.length === 0) return;

  const follower = getUser(followerId);
  const name = publicName(follower ?? { username: null, displayName: null });

  const title = "Nuevo seguidor en PULSE";
  const body = `${name} ha empezado a seguirte.`;
  const url = follower?.username ? `/u/${follower.username}` : "/profile";

  await sendToUser(subs, { title, body, url });
  logSent(followeeId, null, "new_follower", title, body);
}
