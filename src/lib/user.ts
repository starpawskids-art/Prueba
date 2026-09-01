import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import db from "./db";

const COOKIE_NAME = "pulse_uid";

export type PulseUser = {
  id: string;
  createdAt: number;
  lastVisitAt: number | null;
  interests: string[];
};

function rowToUser(row: {
  id: string;
  created_at: number;
  last_visit_at: number | null;
  interests_json: string;
}): PulseUser {
  return {
    id: row.id,
    createdAt: row.created_at,
    lastVisitAt: row.last_visit_at,
    interests: JSON.parse(row.interests_json),
  };
}

// The pulse_uid cookie itself is assigned by middleware.ts — cookies can
// only be *set* from middleware/Server Actions/Route Handlers, never from
// a Server Component render, so by the time any page or handler runs here
// the cookie is guaranteed to already exist. This just ensures the
// matching DB row exists (a plain write, unrelated to that restriction).
export async function getOrCreateUserId(): Promise<string> {
  const store = await cookies();
  const id = store.get(COOKIE_NAME)?.value ?? randomUUID();
  db.prepare(
    `INSERT OR IGNORE INTO users (id, created_at, last_visit_at, interests_json) VALUES (?, ?, NULL, '[]')`
  ).run(id, Date.now());
  return id;
}

export function getUser(id: string): PulseUser | null {
  const row = db.prepare(`SELECT * FROM users WHERE id = ?`).get(id) as
    | Parameters<typeof rowToUser>[0]
    | undefined;
  return row ? rowToUser(row) : null;
}

export function setInterests(id: string, interests: string[]) {
  db.prepare(`UPDATE users SET interests_json = ? WHERE id = ?`).run(
    JSON.stringify(interests),
    id
  );
}

export function touchVisit(id: string): number | null {
  const user = getUser(id);
  const previous = user?.lastVisitAt ?? null;
  db.prepare(`UPDATE users SET last_visit_at = ? WHERE id = ?`).run(Date.now(), id);
  return previous;
}
