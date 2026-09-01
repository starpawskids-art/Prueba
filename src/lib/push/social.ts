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

// Fired when someone replies to your comment on a Pulse — parentAuthorId
// is already guaranteed non-null and different from the replier (see
// lib/social/comments.ts#addComment), so no self-notification check
// needed here.
export async function notifyCommentReply(
  replierId: string,
  parentAuthorId: string,
  pulseId: string,
  replyBody: string
): Promise<void> {
  if (countSentInWindow(parentAuthorId) >= CAP_PER_ROLLING_DAY) return;

  const subs = db
    .prepare(`SELECT * FROM push_subscriptions WHERE user_id = ?`)
    .all(parentAuthorId) as SubscriptionRow[];
  if (subs.length === 0) return;

  const replier = getUser(replierId);
  const name = publicName(replier ?? { username: null, displayName: null });

  const title = "Respondieron a tu comentario";
  const body = `${name}: "${replyBody}"`;
  const url = `/pulse/${pulseId}`;

  await sendToUser(subs, { title, body, url });
  logSent(parentAuthorId, pulseId, "comment_reply", title, body);
}
