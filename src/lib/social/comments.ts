import { randomUUID } from "node:crypto";
import db from "../db";
import { sanitizeCommentBody } from "../moderation";
import { getUser, publicName } from "../user";

export const ATTENTION_VOTE_THRESHOLD = 3;

export type CommentAuthor = { userId: string; name: string; username: string | null };

export type PulseComment = {
  id: string;
  pulseId: string;
  body: string;
  createdAt: number;
  author: CommentAuthor;
  parentCommentId: string | null;
  replyToName: string | null;
  voteCount: number;
  viewerHasVoted: boolean;
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
      voteCount: 0,
      viewerHasVoted: false,
    },
    // No self-notification when replying to your own comment.
    parentAuthorId: parentAuthorId && parentAuthorId !== userId ? parentAuthorId : null,
  };
}

export type ToggleVoteResult =
  | {
      ok: true;
      voted: boolean;
      voteCount: number;
      crossedThreshold: boolean;
      authorId: string;
      pulseId: string;
      body: string;
    }
  | { ok: false; reason: string };

// Simple upvote, not up/down — matches the doc's "calidad sobre engagement
// artificial": a like signals "this added something", not a popularity
// contest. Self-votes are rejected outright rather than silently ignored,
// so the UI can tell the difference between "already voted" and "can't
// vote on your own comment".
export function toggleCommentVote(userId: string, commentId: string): ToggleVoteResult {
  const comment = db
    .prepare(`SELECT user_id, pulse_id, body FROM pulse_comments WHERE id = ? AND hidden_at IS NULL`)
    .get(commentId) as { user_id: string; pulse_id: string; body: string } | undefined;
  if (!comment) return { ok: false, reason: "Comentario no encontrado." };
  if (comment.user_id === userId) return { ok: false, reason: "No puedes votar tu propio comentario." };

  const existing = db
    .prepare(`SELECT 1 FROM comment_votes WHERE comment_id = ? AND user_id = ?`)
    .get(commentId, userId);

  let voted: boolean;
  if (existing) {
    db.prepare(`DELETE FROM comment_votes WHERE comment_id = ? AND user_id = ?`).run(commentId, userId);
    voted = false;
  } else {
    db.prepare(`INSERT INTO comment_votes (comment_id, user_id, created_at) VALUES (?, ?, ?)`).run(
      commentId,
      userId,
      Date.now()
    );
    voted = true;
  }

  const voteCount = (
    db.prepare(`SELECT COUNT(*) as n FROM comment_votes WHERE comment_id = ?`).get(commentId) as {
      n: number;
    }
  ).n;

  // Fire the "recibió mucha atención" notification exactly once per
  // comment, the moment it first reaches the threshold — not every time
  // it's re-crossed by a vote/unvote/vote flap.
  let crossedThreshold = false;
  if (voted && voteCount >= ATTENTION_VOTE_THRESHOLD) {
    const row = db
      .prepare(`SELECT attention_notified_at FROM pulse_comments WHERE id = ?`)
      .get(commentId) as { attention_notified_at: number | null };
    if (row.attention_notified_at === null) {
      db.prepare(`UPDATE pulse_comments SET attention_notified_at = ? WHERE id = ?`).run(Date.now(), commentId);
      crossedThreshold = true;
    }
  }

  return {
    ok: true,
    voted,
    voteCount,
    crossedThreshold,
    authorId: comment.user_id,
    pulseId: comment.pulse_id,
    body: comment.body,
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
  vote_count: number;
  viewer_has_voted: number;
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
    voteCount: row.vote_count,
    viewerHasVoted: !!row.viewer_has_voted,
  };
}

function selectWithVotes(viewerId: string | null) {
  return `
    SELECT c.id, c.pulse_id, c.user_id, c.body, c.created_at, c.parent_comment_id,
           u.username, u.display_name,
           pu.username as reply_to_username, pu.display_name as reply_to_display_name,
           (SELECT COUNT(*) FROM comment_votes v WHERE v.comment_id = c.id) as vote_count,
           ${viewerId ? "(SELECT 1 FROM comment_votes v WHERE v.comment_id = c.id AND v.user_id = ?)" : "0"} as viewer_has_voted
    FROM pulse_comments c
    JOIN users u ON u.id = c.user_id
    LEFT JOIN pulse_comments pc ON pc.id = c.parent_comment_id
    LEFT JOIN users pu ON pu.id = pc.user_id
  `;
}

export function getCommentsForPulse(pulseId: string, viewerId: string | null): PulseComment[] {
  const args = viewerId ? [viewerId, pulseId] : [pulseId];
  const rows = db
    .prepare(
      `${selectWithVotes(viewerId)} WHERE c.pulse_id = ? AND c.hidden_at IS NULL ORDER BY c.created_at ASC`
    )
    .all(...args) as CommentRow[];
  return rows.map(rowToComment);
}

export type PulseCommentWithPulse = PulseComment & { pulseTitle: string };

export function getCommentsByUser(userId: string, limit = 20): PulseCommentWithPulse[] {
  const rows = db
    .prepare(
      `SELECT c.id, c.pulse_id, c.user_id, c.body, c.created_at, c.parent_comment_id,
              u.username, u.display_name,
              pu.username as reply_to_username, pu.display_name as reply_to_display_name,
              (SELECT COUNT(*) FROM comment_votes v WHERE v.comment_id = c.id) as vote_count,
              0 as viewer_has_voted,
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
