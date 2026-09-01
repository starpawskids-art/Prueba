import { classifyTopic } from "../topics";
import { RawCandidate } from "./types";

const BASE = "https://hacker-news.firebaseio.com/v0";
const CANDIDATE_LIMIT = 40;

type HnItem = {
  id: number;
  title?: string;
  url?: string;
  score?: number;
  descendants?: number;
  time?: number;
  type?: string;
};

async function fetchJson<T>(url: string, timeoutMs = 8000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HN request failed: ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

// Real, keyless public API. Engagement metric = score + 2x comment count,
// a simple proxy for "how much attention this is getting right now".
export async function fetchHackerNewsCandidates(): Promise<RawCandidate[]> {
  const ids = await fetchJson<number[]>(`${BASE}/topstories.json`);
  const top = ids.slice(0, CANDIDATE_LIMIT);

  const items = await Promise.all(
    top.map((id) => fetchJson<HnItem>(`${BASE}/item/${id}.json`).catch(() => null))
  );

  const candidates: RawCandidate[] = [];
  for (const item of items) {
    if (!item || item.type !== "story" || !item.title) continue;
    const metric = (item.score ?? 0) + (item.descendants ?? 0) * 2;
    candidates.push({
      source: "hackernews",
      sourceLabel: "Hacker News",
      sourceQuality: 0.75,
      externalId: String(item.id),
      title: item.title,
      url: item.url ?? `https://news.ycombinator.com/item?id=${item.id}`,
      metric,
      metricKind: "engagement (puntos + comentarios)",
      topicHint: classifyTopic(item.title, "Tecnología"),
    });
  }
  return candidates;
}
