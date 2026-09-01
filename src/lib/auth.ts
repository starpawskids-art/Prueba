import crypto from "node:crypto";
import db from "./db";

// Real credentials (email + password) and real server-side sessions — no
// external auth provider, no new dependency. Password hashing uses Node's
// built-in scrypt (no bcrypt/argon2 package needed); sessions are a random
// token whose SHA-256 hash is what's stored, so a DB read alone can't be
// replayed as a cookie.
const SCRYPT_KEYLEN = 64;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days, sliding

export const SESSION_COOKIE_NAME = "pulse_session";

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function createSession(userId: string): { token: string; expiresAt: number } {
  const token = crypto.randomBytes(32).toString("hex");
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;
  db.prepare(
    `INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)`
  ).run(hashToken(token), userId, now, expiresAt);
  return { token, expiresAt };
}

// Returns the session's user id, sliding its expiry forward — or null if
// the token is missing/unknown/expired (and prunes it in that last case).
export function resolveSession(token: string): string | null {
  const tokenHash = hashToken(token);
  const row = db.prepare(`SELECT user_id, expires_at FROM sessions WHERE token_hash = ?`).get(
    tokenHash
  ) as { user_id: string; expires_at: number } | undefined;
  if (!row) return null;

  if (row.expires_at < Date.now()) {
    db.prepare(`DELETE FROM sessions WHERE token_hash = ?`).run(tokenHash);
    return null;
  }

  db.prepare(`UPDATE sessions SET expires_at = ? WHERE token_hash = ?`).run(
    Date.now() + SESSION_TTL_MS,
    tokenHash
  );
  return row.user_id;
}

export function destroySession(token: string): void {
  db.prepare(`DELETE FROM sessions WHERE token_hash = ?`).run(hashToken(token));
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  // Deliberately simple — good enough to catch typos, not RFC 5322.
  // There is no verification email sent (see README), so this can't
  // confirm the address is real or owned by the registrant anyway.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPassword(password: string): boolean {
  return password.length >= 8 && password.length <= 200;
}

export type CredentialsRow = { user_id: string; email: string; password_hash: string };

export function findCredentialsByEmail(email: string): CredentialsRow | null {
  const row = db.prepare(`SELECT * FROM credentials WHERE email = ?`).get(email) as
    | CredentialsRow
    | undefined;
  return row ?? null;
}

export function hasCredentials(userId: string): boolean {
  return !!db.prepare(`SELECT 1 FROM credentials WHERE user_id = ?`).get(userId);
}

export function getEmailForUser(userId: string): string | null {
  const row = db.prepare(`SELECT email FROM credentials WHERE user_id = ?`).get(userId) as
    | { email: string }
    | undefined;
  return row?.email ?? null;
}

export function attachCredentials(userId: string, email: string, password: string): void {
  db.prepare(
    `INSERT INTO credentials (user_id, email, password_hash, created_at) VALUES (?, ?, ?, ?)`
  ).run(userId, email, hashPassword(password), Date.now());
}
