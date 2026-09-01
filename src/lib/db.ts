import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, "pulse.db");

declare global {
  var __pulseDb: Database.Database | undefined;
}

export const db = global.__pulseDb ?? new Database(dbPath);
if (process.env.NODE_ENV !== "production") global.__pulseDb = db;

db.pragma("busy_timeout = 5000");
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS signals (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    external_id TEXT NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    topic TEXT NOT NULL,
    metric REAL NOT NULL,
    prev_metric REAL,
    rank INTEGER,
    prev_rank INTEGER,
    first_seen_at INTEGER NOT NULL,
    last_seen_at INTEGER NOT NULL,
    metric_kind TEXT NOT NULL,
    lang TEXT NOT NULL DEFAULT 'en',
    UNIQUE(source, external_id)
  );

  CREATE TABLE IF NOT EXISTS pulses (
    id TEXT PRIMARY KEY,
    signal_id TEXT NOT NULL,
    title TEXT NOT NULL,
    change_text TEXT NOT NULL,
    why_it_matters TEXT NOT NULL,
    topic TEXT NOT NULL,
    novelty_minutes INTEGER NOT NULL,
    momentum REAL NOT NULL,
    confidence TEXT NOT NULL,
    score REAL NOT NULL,
    sources_json TEXT NOT NULL,
    detected_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    lang TEXT NOT NULL DEFAULT 'en',
    hidden_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    last_visit_at INTEGER,
    interests_json TEXT NOT NULL DEFAULT '[]',
    custom_interests_json TEXT NOT NULL DEFAULT '[]',
    language TEXT,
    username TEXT,
    display_name TEXT,
    bio TEXT
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username) WHERE username IS NOT NULL;

  CREATE TABLE IF NOT EXISTS visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    visited_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_visits_user ON visits(user_id, visited_at);

  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    reporter_user_id TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    reason TEXT,
    created_at INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
  );

  CREATE TABLE IF NOT EXISTS follows_user (
    follower_id TEXT NOT NULL,
    followee_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (follower_id, followee_id)
  );

  CREATE TABLE IF NOT EXISTS pulse_comments (
    id TEXT PRIMARY KEY,
    pulse_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    hidden_at INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_comments_pulse ON pulse_comments(pulse_id, created_at);

  CREATE TABLE IF NOT EXISTS interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    pulse_id TEXT NOT NULL,
    type TEXT NOT NULL,
    topic TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ingest_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at INTEGER NOT NULL,
    finished_at INTEGER,
    signals_seen INTEGER DEFAULT 0,
    pulses_generated INTEGER DEFAULT 0,
    error TEXT
  );

  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS notifications_sent (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    pulse_id TEXT,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    sent_at INTEGER NOT NULL
  );
`);

// Idempotent migration for databases created before language/custom-topic
// support existed. CREATE TABLE IF NOT EXISTS above already covers fresh
// installs; this only matters for a pre-existing local data/pulse.db.
const migrations: string[] = [
  "ALTER TABLE signals ADD COLUMN lang TEXT NOT NULL DEFAULT 'en'",
  "ALTER TABLE pulses ADD COLUMN lang TEXT NOT NULL DEFAULT 'en'",
  "ALTER TABLE users ADD COLUMN custom_interests_json TEXT NOT NULL DEFAULT '[]'",
  "ALTER TABLE users ADD COLUMN language TEXT",
  "ALTER TABLE pulses ADD COLUMN hidden_at INTEGER",
  "ALTER TABLE users ADD COLUMN username TEXT",
  "ALTER TABLE users ADD COLUMN display_name TEXT",
  "ALTER TABLE users ADD COLUMN bio TEXT",
];
for (const statement of migrations) {
  try {
    db.exec(statement);
  } catch {
    // column already exists — fine
  }
}

export default db;
