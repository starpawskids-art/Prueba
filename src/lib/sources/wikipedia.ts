import { classifyTopic } from "../topics";
import { RawCandidate } from "./types";

// Real, keyless public API (Wikimedia REST). Daily granularity: we use the
// most recently completed day, so "metric" is that day's pageview count.
// Momentum is derived poll-over-poll by lib/pipeline against our own
// stored snapshots, not fabricated.
function yesterday(): { y: string; m: string; d: string } {
  const date = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return {
    y: String(date.getUTCFullYear()),
    m: String(date.getUTCMonth() + 1).padStart(2, "0"),
    d: String(date.getUTCDate()).padStart(2, "0"),
  };
}

type TopviewsResponse = {
  items: Array<{
    articles: Array<{ article: string; views: number; rank: number }>;
  }>;
};

const EXCLUDED = new Set(["Main_Page", "Special:Search", "Special:MyLanguage/Main_Page"]);

export async function fetchWikipediaCandidates(): Promise<RawCandidate[]> {
  const { y, m, d } = yesterday();
  const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/en.wikipedia/all-access/${y}/${m}/${d}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  let data: TopviewsResponse;
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "PulseApp/0.1 (product research MVP)" },
    });
    if (!res.ok) throw new Error(`Wikipedia request failed: ${res.status}`);
    data = (await res.json()) as TopviewsResponse;
  } finally {
    clearTimeout(timer);
  }

  const articles = (data.items?.[0]?.articles ?? [])
    .filter((a) => !EXCLUDED.has(a.article))
    .slice(0, 40);

  return articles.map((a) => {
    const title = a.article.replace(/_/g, " ");
    return {
      source: "wikipedia",
      sourceLabel: "Wikipedia",
      sourceQuality: 0.85,
      externalId: a.article,
      title,
      url: `https://en.wikipedia.org/wiki/${a.article}`,
      metric: a.views,
      metricKind: "vistas en el último día",
      topicHint: classifyTopic(title, "Curiosidades"),
    } satisfies RawCandidate;
  });
}
