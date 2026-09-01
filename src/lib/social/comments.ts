import { randomUUID } from "node:crypto";
import db from "../db";
import { sanitizeCommentBody } from "../moderation";
import { getUser, publicName } from "../user";

export type CommentAuthor = { userId: string; name: string; username: string | null };

export type PulseComment = {
  id: string;
  pulseId: string;
  body: string;
  createdAt: number;
  author: CommentAuthor;
  parentCommentId: string | null;
  replyToName: string | null;
};

export type AddCommentResult =
  | { ok: true; comment: PulseComment; parentAuthorId: string | null }
  | { ok: false; reason: string };

// The product doc's "Pulse colaborativa" (section 21): users add context
// to a Pulse. Moderated the same way as every other free-text field.
// Optionally a reply to another comment on the same Pulse — the caller
// gets parentAuthorId back so it can fire a "someone replied to you"
// notification without a second round-trip.
export function addComment(
  userId: string,
  pulseId: string,
  rawBody: string,
  parentCommentId?: string | null
): AddCommentResult {
  const pulse = db.prepare(`SELECT id FROM pulses WHERE id = ?`).get(pulseId);
  if (!pulse) return { ok: false, reason: "Pulse no encontrada." };

  let parentAuthorId: string | null = null;
  let replyToName: string | null = null;
  if (parentCommentId) {
    const parent = db
      .prepare(
        `SELECT c.user_id, u.username, u.display_name FROM pulse_comments c
         JOIN users u ON u.id = c.user_id
         WHERE c.id = ? AND c.pulse_id = ? AND c.hidden_at IS NULL`
      )
      .get(parentCommentId, pulseId) as
      | { user_id: string; username: string | null; display_name: string | null }
      | undefined;
    if (!parent) return { ok: false, reason: "El comentario al que respondes ya no existe." };
    parentAuthorId = parent.user_id;
    replyToName = publicName({ username: parent.username, displayName: parent.display_name });
  }

  const result = sanitizeCommentBody(rawBody);
  if (!result.ok) return { ok: false, reason: result.reason };

  const id = randomUUID();
  const createdAt = Date.now();
  db.prepare(
    `INSERT INTO pulse_comments (id, pulse_id, user_id, body, created_at, parent_comment_id) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, pulseId, userId, result.value, createdAt, parentCommentId ?? null);

  const user = getUser(userId);
  return {
    ok: true,
    comment: {
      id,
      pulseId,
      body: result.value,
      createdAt,
      author: { userId, name: publicName(user ?? { username: null, displayName: null }), username: user?.username ?? null },
      parentCommentId: parentCommentId ?? null,
      replyToName,
    },
    // No self-notification when replying to your own comment.
    parentAuthorId: parentAuthorId && parentAuthorId !== userId ? parentAuthorId : null,
  };
}

type CommentRow = {
  id: string;
  pulse_id: string;
  user_id: string;
  body: string;
  created_at: number;
  username: string | null;
  display_name: string | null;
  parent_comment_id: string | null;
  reply_to_username: string | null;
  reply_to_display_name: string | null;
};

function rowToComment(row: CommentRow): PulseComment {
  return {
    id: row.id,
    pulseId: row.pulse_id,
    body: row.body,
    createdAt: row.created_at,
    author: {
      userId: row.user_id,
      name: publicName({ username: row.username, displayName: row.display_name }),
      username: row.username,
    },
    parentCommentId: row.parent_comment_id,
    replyToName: row.parent_comment_id
      ? publicName({ username: row.reply_to_username, displayName: row.reply_to_display_name })
      : null,
  };
}

const SELECT_WITH_REPLY_TARGET = `
  SELECT c.id, c.pulse_id, c.user_id, c.body, c.created_at, c.parent_comment_id,
         u.username, u.display_name,
         pu.username as reply_to_username, pu.display_name as reply_to_display_name
  FROM pulse_comments c
  JOIN users u ON u.id = c.user_id
  LEFT JOIN pulse_comments pc ON pc.id = c.parent_comment_id
  LEFT JOIN users pu ON pu.id = pc.user_id
`;

export function getCommentsForPulse(pulseId: string): PulseComment[] {
  const rows = db
    .prepare(`${SELECT_WITH_REPLY_TARGET} WHERE c.pulse_id = ? AND c.hidden_at IS NULL ORDER BY c.created_at ASC`)
    .all(pulseId) as CommentRow[];
  return rows.map(rowToComment);
}

export type PulseCommentWithPulse = PulseComment & { pulseTitle: string };

export function getCommentsByUser(userId: string, limit = 20): PulseCommentWithPulse[] {
  const rows = db
    .prepare(
      `SELECT c.id, c.pulse_id, c.user_id, c.body, c.created_at, c.parent_comment_id,
              u.username, u.display_name,
              pu.username as reply_to_username, pu.display_name as reply_to_display_name,
              p.title as pulse_title
       FROM pulse_comments c
       JOIN users u ON u.id = c.user_id
       JOIN pulses p ON p.id = c.pulse_id
       LEFT JOIN pulse_comments pc ON pc.id = c.parent_comment_id
       LEFT JOIN users pu ON pu.id = pc.user_id
       WHERE c.user_id = ? AND c.hidden_at IS NULL
       ORDER BY c.created_at DESC LIMIT ?`
    )
    .all(userId, limit) as Array<CommentRow & { pulse_title: string }>;
  return rows.map((r) => ({ ...rowToComment(r), pulseTitle: r.pulse_title }));
}
