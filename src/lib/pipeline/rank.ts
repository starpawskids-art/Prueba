import db from "../db";
import { NOVELTY_HALFLIFE } from "./run";
import { Confidence, Pulse, SourceRef, Topic } from "../types";

type PulseRow = {
  id: string;
  title: string;
  change_text: string;
  why_it_matters: string;
  topic: string;
  novelty_minutes: number;
  momentum: number;
  confidence: string;
  score: number; // source quality, stored under a generic column name
  sources_json: string;
  detected_at: number;
  updated_at: number;
};

const RECENCY_WINDOW_MS = 48 * 60 * 60 * 1000;
const EXPLORATION_SHARE = 0.2;

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function topicAffinity(userId: string, interests: string[]): Map<string, number> {
  const rows = db
    .prepare(
      `SELECT topic, type, COUNT(*) as n FROM interactions WHERE user_id = ? GROUP BY topic, type`
    )
    .all(userId) as Array<{ topic: string; type: string; n: number }>;

  const affinity = new Map<string, number>();
  const base = (topic: string) => (interests.includes(topic) ? 0.65 : 0.35);

  const topics = new Set<string>([...interests, ...rows.map((r) => r.topic)]);
  for (const topic of topics) affinity.set(topic, base(topic));

  for (const row of rows) {
    const current = affinity.get(row.topic) ?? base(row.topic);
    const weight = row.type === "save" || row.type === "follow" || row.type === "more" ? 0.06 : row.type === "dismiss" || row.type === "less" ? -0.08 : 0.01;
    affinity.set(row.topic, clamp01(current + weight * row.n));
  }
  return affinity;
}

export type RankedPulse = Pulse & { isExploration: boolean };

export function getFeed(userId: string, limit = 10): RankedPulse[] {
  const since = Date.now() - RECENCY_WINDOW_MS;
  const rows = db
    .prepare(`SELECT * FROM pulses WHERE updated_at >= ? ORDER BY updated_at DESC`)
    .all(since) as PulseRow[];

  if (rows.length === 0) return [];

  const user = db.prepare(`SELECT interests_json FROM users WHERE id = ?`).get(userId) as
    | { interests_json: string }
    | undefined;
  const interests: string[] = user ? JSON.parse(user.interests_json) : [];
  const affinity = topicAffinity(userId, interests);

  const momenta = rows.map((r) => r.momentum);
  const minM = Math.min(...momenta);
  const maxM = Math.max(...momenta);
  const now = Date.now();

  type Scored = {
    row: PulseRow;
    momentum01: number;
    novelty01: number;
    relevancia: number;
    calidadFuente: number;
    baseScore: number;
  };

  const scored: Scored[] = rows.map((row) => {
    const momentum01 = maxM === minM ? 0.5 : (row.momentum - minM) / (maxM - minM);
    const ageMinutes = Math.max(0, (now - row.detected_at) / 60000);
    const novelty01 = clamp01(1 - ageMinutes / NOVELTY_HALFLIFE);
    const relevancia = affinity.get(row.topic) ?? 0.35;
    const calidadFuente = row.score;
    const baseScore = 0.3 * momentum01 + 0.25 * novelty01 + 0.2 * relevancia + 0.15 * calidadFuente;
    return { row, momentum01, novelty01, relevancia, calidadFuente, baseScore };
  });

  // Greedy diversity re-ranking: diversidad weight (0.10) shrinks the more
  // times a topic has already been picked for this feed.
  const remaining = [...scored];
  const picked: Array<Scored & { diversidad: number; finalScore: number }> = [];
  const topicCounts = new Map<string, number>();

  while (remaining.length > 0 && picked.length < limit) {
    let bestIdx = 0;
    let bestFinal = -Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const count = topicCounts.get(remaining[i].row.topic) ?? 0;
      const diversidad = clamp01(1 - count / 3);
      const finalScore = remaining[i].baseScore + 0.1 * diversidad;
      if (finalScore > bestFinal) {
        bestFinal = finalScore;
        bestIdx = i;
      }
    }
    const chosen = remaining.splice(bestIdx, 1)[0];
    const count = topicCounts.get(chosen.row.topic) ?? 0;
    topicCounts.set(chosen.row.topic, count + 1);
    picked.push({ ...chosen, diversidad: clamp01(1 - count / 3), finalScore: bestFinal });
  }

  // Exploration: ensure a slice of the feed comes from outside the user's
  // declared interests, even if it scored slightly lower.
  if (interests.length > 0 && picked.length > 0) {
    const explorationSlots = Math.max(1, Math.round(picked.length * EXPLORATION_SHARE));
    const inProfile = picked.filter((p) => interests.includes(p.row.topic));
    const outside = scored
      .filter((s) => !interests.includes(s.row.topic) && !picked.some((p) => p.row.id === s.row.id))
      .sort((a, b) => b.baseScore - a.baseScore)
      .slice(0, explorationSlots);

    if (outside.length > 0 && inProfile.length > explorationSlots) {
      const trimmed = picked
        .filter((p) => interests.includes(p.row.topic))
        .sort((a, b) => b.finalScore - a.finalScore)
        .slice(0, picked.length - outside.length);
      const merged = [...trimmed, ...outside.map((o) => ({ ...o, diversidad: 1, finalScore: o.baseScore }))]
        .sort((a, b) => b.finalScore - a.finalScore);
      return merged.map((m) => toRankedPulse(m.row, m.finalScore, !interests.includes(m.row.topic)));
    }
  }

  return picked
    .sort((a, b) => b.finalScore - a.finalScore)
    .map((p) => toRankedPulse(p.row, p.finalScore, false));
}

function toRankedPulse(row: PulseRow, score: number, isExploration: boolean): RankedPulse {
  return {
    id: row.id,
    title: row.title,
    changeText: row.change_text,
    whyItMatters: row.why_it_matters,
    topic: row.topic as Topic,
    noveltyMinutes: row.novelty_minutes,
    momentum: row.momentum,
    confidence: row.confidence as Confidence,
    score,
    sources: JSON.parse(row.sources_json) as SourceRef[],
    detectedAt: row.detected_at,
    updatedAt: row.updated_at,
    isExploration,
  };
}

export function getPulseById(id: string): Pulse | null {
  const row = db.prepare(`SELECT * FROM pulses WHERE id = ?`).get(id) as PulseRow | undefined;
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    changeText: row.change_text,
    whyItMatters: row.why_it_matters,
    topic: row.topic as Topic,
    noveltyMinutes: row.novelty_minutes,
    momentum: row.momentum,
    confidence: row.confidence as Confidence,
    score: row.score,
    sources: JSON.parse(row.sources_json) as SourceRef[],
    detectedAt: row.detected_at,
    updatedAt: row.updated_at,
  };
}

export function countChangesSince(timestamp: number | null): number {
  if (timestamp === null) return 0;
  const row = db
    .prepare(`SELECT COUNT(*) as n FROM pulses WHERE detected_at > ?`)
    .get(timestamp) as { n: number };
  return row.n;
}
