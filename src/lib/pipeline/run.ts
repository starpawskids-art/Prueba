import { randomUUID } from "node:crypto";
import db from "../db";
import { fetchHackerNewsCandidates } from "../sources/hackernews";
import { fetchWikipediaCandidates } from "../sources/wikipedia";
import { fetchGithubCandidates } from "../sources/github";
import { fetchRssFeed, RSS_FEEDS } from "../sources/rss";
import { RawCandidate } from "../sources/types";
import { dedupeCandidates } from "./dedupe";
import { buildChangeText, buildWhyItMatters, computeConfidence } from "./summarize";
import { Confidence, LANGUAGES, SourceRef, Topic } from "../types";

const NOVELTY_HALFLIFE_MINUTES = 180;

type SignalRow = {
  id: string;
  source: string;
  external_id: string;
  title: string;
  url: string;
  topic: string;
  metric: number;
  prev_metric: number | null;
  rank: number | null;
  prev_rank: number | null;
  first_seen_at: number;
  last_seen_at: number;
  metric_kind: string;
  lang: string;
};

function upsertSignal(candidate: RawCandidate, rank: number, now: number): SignalRow {
  const existing = db
    .prepare(`SELECT * FROM signals WHERE source = ? AND external_id = ?`)
    .get(candidate.source, candidate.externalId) as SignalRow | undefined;

  if (existing) {
    db.prepare(
      `UPDATE signals SET title=?, url=?, topic=?, metric=?, prev_metric=?, rank=?, prev_rank=?, last_seen_at=?, metric_kind=?, lang=? WHERE id=?`
    ).run(
      candidate.title,
      candidate.url,
      candidate.topicHint,
      candidate.metric,
      existing.metric,
      rank,
      existing.rank,
      now,
      candidate.metricKind,
      candidate.lang,
      existing.id
    );
    return { ...existing, metric: candidate.metric, prev_metric: existing.metric, rank, prev_rank: existing.rank, last_seen_at: now, lang: candidate.lang };
  }

  const id = randomUUID();
  db.prepare(
    `INSERT INTO signals (id, source, external_id, title, url, topic, metric, prev_metric, rank, prev_rank, first_seen_at, last_seen_at, metric_kind, lang)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL, ?, ?, ?, ?)`
  ).run(id, candidate.source, candidate.externalId, candidate.title, candidate.url, candidate.topicHint, candidate.metric, rank, now, now, candidate.metricKind, candidate.lang);
  return {
    id,
    source: candidate.source,
    external_id: candidate.externalId,
    title: candidate.title,
    url: candidate.url,
    topic: candidate.topicHint,
    metric: candidate.metric,
    prev_metric: null,
    rank,
    prev_rank: null,
    first_seen_at: now,
    last_seen_at: now,
    metric_kind: candidate.metricKind,
    lang: candidate.lang,
  };
}

function upsertPulse(
  signal: SignalRow,
  sourceQuality: number,
  sourceLabel: string,
  extraSources: SourceRef[],
  now: number
) {
  const ageMinutes = Math.max(0, (now - signal.first_seen_at) / 60000);
  const isNew = signal.prev_metric === null;
  const deltaMetric = isNew ? null : signal.metric - (signal.prev_metric as number);
  const elapsedMinutes = Math.max(1, (signal.last_seen_at - signal.first_seen_at) / 60000);
  const momentumRaw = isNew ? signal.metric : Math.max(0, (deltaMetric ?? 0)) / elapsedMinutes;

  const sourceCount = 1 + extraSources.length;
  const changeText = buildChangeText({
    title: signal.title,
    topic: signal.topic as Topic,
    sourceLabel,
    sourceCount,
    metric: signal.metric,
    metricKind: signal.metric_kind,
    deltaMetric,
    isNew,
    ageMinutes,
  });
  const whyItMatters = buildWhyItMatters({
    title: signal.title,
    topic: signal.topic as Topic,
    sourceLabel,
    sourceCount,
    metric: signal.metric,
    metricKind: signal.metric_kind,
    deltaMetric,
    isNew,
    ageMinutes,
  });
  const confidence: Confidence = computeConfidence(sourceQuality, sourceCount, signal.metric);

  const sources: SourceRef[] = [{ publisher: sourceLabel, url: signal.url }, ...extraSources];

  const existing = db.prepare(`SELECT id FROM pulses WHERE signal_id = ?`).get(signal.id) as
    | { id: string }
    | undefined;
  const noveltyMinutes = Math.round(ageMinutes);

  if (existing) {
    db.prepare(
      `UPDATE pulses SET title=?, change_text=?, why_it_matters=?, topic=?, novelty_minutes=?, momentum=?, confidence=?, score=?, sources_json=?, updated_at=?, lang=? WHERE id=?`
    ).run(
      signal.title,
      changeText,
      whyItMatters,
      signal.topic,
      noveltyMinutes,
      momentumRaw,
      confidence,
      sourceQuality,
      JSON.stringify(sources),
      now,
      signal.lang,
      existing.id
    );
  } else {
    db.prepare(
      `INSERT INTO pulses (id, signal_id, title, change_text, why_it_matters, topic, novelty_minutes, momentum, confidence, score, sources_json, detected_at, updated_at, lang)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      randomUUID(),
      signal.id,
      signal.title,
      changeText,
      whyItMatters,
      signal.topic,
      noveltyMinutes,
      momentumRaw,
      confidence,
      sourceQuality,
      JSON.stringify(sources),
      signal.first_seen_at,
      now,
      signal.lang
    );
  }
}

export type IngestResult = {
  signalsSeen: number;
  pulsesGenerated: number;
  errors: string[];
  ranAt: number;
};

export async function runIngestion(): Promise<IngestResult> {
  const now = Date.now();
  const runId = db
    .prepare(`INSERT INTO ingest_runs (started_at) VALUES (?)`)
    .run(now).lastInsertRowid as number;

  // Wikipedia is polled once per supported language edition — each one is
  // a genuinely distinct source of "what's trending", not a translation.
  const sourceFns: Array<{ label: string; quality: number; fn: () => Promise<RawCandidate[]> }> = [
    { label: "Hacker News", quality: 0.75, fn: fetchHackerNewsCandidates },
    { label: "GitHub", quality: 0.7, fn: fetchGithubCandidates },
    ...LANGUAGES.map(({ code, label }) => ({
      label: `Wikipedia (${label})`,
      quality: 0.85,
      fn: () => fetchWikipediaCandidates(code),
    })),
    ...RSS_FEEDS.map((feed) => ({
      label: feed.label,
      quality: feed.quality,
      fn: () => fetchRssFeed(feed),
    })),
  ];

  const settled = await Promise.allSettled(sourceFns.map((s) => s.fn()));
  const errors: string[] = [];
  const allCandidates: RawCandidate[] = [];
  settled.forEach((result, i) => {
    if (result.status === "fulfilled") {
      allCandidates.push(...result.value);
    } else {
      errors.push(`${sourceFns[i].label}: ${result.reason}`);
    }
  });

  const deduped = dedupeCandidates(allCandidates);

  // Ranked within (source, language) — an es.wikipedia article's rank
  // shouldn't compete numerically against en.wikipedia's.
  const batches = new Map<string, typeof deduped>();
  for (const c of deduped) {
    const key = `${c.source}:${c.lang}`;
    const list = batches.get(key) ?? [];
    list.push(c);
    batches.set(key, list);
  }
  for (const list of batches.values()) list.sort((a, b) => b.metric - a.metric);

  let pulsesGenerated = 0;
  for (const list of batches.values()) {
    list.forEach((candidate, idx) => {
      const signal = upsertSignal(candidate, idx + 1, now);
      const extraSources: SourceRef[] = candidate.mergedFrom.map((m) => ({
        publisher: m.sourceLabel,
        url: m.url,
      }));
      upsertPulse(signal, candidate.sourceQuality, candidate.sourceLabel, extraSources, now);
      pulsesGenerated++;
    });
  }

  db.prepare(
    `UPDATE ingest_runs SET finished_at=?, signals_seen=?, pulses_generated=?, error=? WHERE id=?`
  ).run(Date.now(), deduped.length, pulsesGenerated, errors.length ? errors.join(" | ") : null, runId);

  return { signalsSeen: deduped.length, pulsesGenerated, errors, ranAt: now };
}

export const NOVELTY_HALFLIFE = NOVELTY_HALFLIFE_MINUTES;
