import db from "../db";
import { getUser, publicName } from "../user";

export type FollowResult = { ok: true } | { ok: false; reason: string };

export function followUser(followerId: string, followeeId: string): FollowResult {
  if (followerId === followeeId) return { ok: false, reason: "No puedes seguirte a ti mismo." };
  const target = getUser(followeeId);
  if (!target) return { ok: false, reason: "Usuario no encontrado." };

  db.prepare(
    `INSERT OR IGNORE INTO follows_user (follower_id, followee_id, created_at) VALUES (?, ?, ?)`
  ).run(followerId, followeeId, Date.now());
  return { ok: true };
}

export function unfollowUser(followerId: string, followeeId: string): void {
  db.prepare(`DELETE FROM follows_user WHERE follower_id = ? AND followee_id = ?`).run(
    followerId,
    followeeId
  );
}

export function isFollowingUser(followerId: string, followeeId: string): boolean {
  return !!db
    .prepare(`SELECT 1 FROM follows_user WHERE follower_id = ? AND followee_id = ?`)
    .get(followerId, followeeId);
}

export function getFollowerCount(userId: string): number {
  return (
    db.prepare(`SELECT COUNT(*) as n FROM follows_user WHERE followee_id = ?`).get(userId) as {
      n: number;
    }
  ).n;
}

export function getFollowingCount(userId: string): number {
  return (
    db.prepare(`SELECT COUNT(*) as n FROM follows_user WHERE follower_id = ?`).get(userId) as {
      n: number;
    }
  ).n;
}

export type FollowedUser = { userId: string; name: string; username: string | null };

export function getFollowingUsers(userId: string): FollowedUser[] {
  const rows = db
    .prepare(
      `SELECT u.id, u.username, u.display_name
       FROM follows_user f JOIN users u ON u.id = f.followee_id
       WHERE f.follower_id = ? ORDER BY f.created_at DESC`
    )
    .all(userId) as Array<{ id: string; username: string | null; display_name: string | null }>;
  return rows.map((r) => ({
    userId: r.id,
    name: publicName({ username: r.username, displayName: r.display_name }),
    username: r.username,
  }));
}

export type FollowedActivity = {
  commentId: string;
  pulseId: string;
  pulseTitle: string;
  body: string;
  createdAt: number;
  author: FollowedUser;
};

// The "Personas" activity feed: recent context comments from people this
// user follows — the closest thing PULSE has to a social timeline, built
// on curated contributions rather than a raw firehose of posts.
export function getActivityFromFollowedUsers(userId: string, limit = 30): FollowedActivity[] {
  const rows = db
    .prepare(
      `SELECT c.id as comment_id, c.pulse_id, c.body, c.created_at, p.title as pulse_title,
              u.id as author_id, u.username, u.display_name
       FROM pulse_comments c
       JOIN follows_user f ON f.followee_id = c.user_id AND f.follower_id = ?
       JOIN users u ON u.id = c.user_id
       JOIN pulses p ON p.id = c.pulse_id
       WHERE c.hidden_at IS NULL
       ORDER BY c.created_at DESC LIMIT ?`
    )
    .all(userId, limit) as Array<{
    comment_id: string;
    pulse_id: string;
    body: string;
    created_at: number;
    pulse_title: string;
    author_id: string;
    username: string | null;
    display_name: string | null;
  }>;

  return rows.map((r) => ({
    commentId: r.comment_id,
    pulseId: r.pulse_id,
    pulseTitle: r.pulse_title,
    body: r.body,
    createdAt: r.created_at,
    author: {
      userId: r.author_id,
      name: publicName({ username: r.username, displayName: r.display_name }),
      username: r.username,
    },
  }));
}
