import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import db from "./db";
import { DEFAULT_LANGUAGE, Language, isLanguage } from "./types";

const COOKIE_NAME = "pulse_uid";

export type PulseUser = {
  id: string;
  createdAt: number;
  lastVisitAt: number | null;
  interests: string[];
  customInterests: string[];
  language: Language | null;
};

function rowToUser(row: {
  id: string;
  created_at: number;
  last_visit_at: number | null;
  interests_json: string;
  custom_interests_json: string;
  language: string | null;
}): PulseUser {
  return {
    id: row.id,
    createdAt: row.created_at,
    lastVisitAt: row.last_visit_at,
    interests: JSON.parse(row.interests_json),
    customInterests: JSON.parse(row.custom_interests_json),
    language: row.language && isLanguage(row.language) ? row.language : null,
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
    `INSERT OR IGNORE INTO users (id, created_at, last_visit_at, interests_json, custom_interests_json, language) VALUES (?, ?, NULL, '[]', '[]', NULL)`
  ).run(id, Date.now());
  return id;
}

export function getUser(id: string): PulseUser | null {
  const row = db.prepare(`SELECT * FROM users WHERE id = ?`).get(id) as
    | Parameters<typeof rowToUser>[0]
    | undefined;
  return row ? rowToUser(row) : null;
}

// Language falls back to English whenever the user hasn't picked one —
// "si no se elige ninguno, que salga en inglés por defecto".
export function effectiveLanguage(user: PulseUser | null): Language {
  return user?.language ?? DEFAULT_LANGUAGE;
}

export function setInterests(id: string, interests: string[]) {
  db.prepare(`UPDATE users SET interests_json = ? WHERE id = ?`).run(
    JSON.stringify(interests),
    id
  );
}

export function setCustomInterests(id: string, customInterests: string[]) {
  db.prepare(`UPDATE users SET custom_interests_json = ? WHERE id = ?`).run(
    JSON.stringify(customInterests),
    id
  );
}

export function setLanguage(id: string, language: Language | null) {
  db.prepare(`UPDATE users SET language = ? WHERE id = ?`).run(language, id);
}

export function touchVisit(id: string): number | null {
  const user = getUser(id);
  const previous = user?.lastVisitAt ?? null;
  const now = Date.now();
  db.prepare(`UPDATE users SET last_visit_at = ? WHERE id = ?`).run(now, id);
  db.prepare(`INSERT INTO visits (user_id, visited_at) VALUES (?, ?)`).run(id, now);
  return previous;
}
