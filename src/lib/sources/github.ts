import { classifyTopic } from "../topics";
import { RawCandidate } from "./types";

// Real, keyless public API (GitHub Search). We look at repositories that
// were created very recently and already have meaningful star counts —
// a proxy for "something new is breaking out in tech right now". True
// velocity is computed by the pipeline from our own poll-over-poll star
// snapshots (see pipeline/score.ts), not from this raw number alone.
type GhRepo = {
  id: number;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  language: string | null;
  created_at: string;
};

type GhSearchResponse = { items: GhRepo[] };

async function search(query: string): Promise<GhRepo[]> {
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(
    query
  )}&sort=stars&order=desc&per_page=25`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "PulseApp/0.1 (product research MVP)",
      },
    });
    if (!res.ok) throw new Error(`GitHub search failed: ${res.status}`);
    const data = (await res.json()) as GhSearchResponse;
    return data.items ?? [];
  } finally {
    clearTimeout(timer);
  }
}

function since(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export async function fetchGithubCandidates(): Promise<RawCandidate[]> {
  const [freshRepos, activeRepos] = await Promise.all([
    search(`created:>${since(3)} stars:>20`),
    search(`pushed:>${since(1)} stars:>500`),
  ]);

  const byId = new Map<number, GhRepo>();
  for (const repo of [...freshRepos, ...activeRepos]) byId.set(repo.id, repo);

  return Array.from(byId.values()).map((repo) => {
    const title = `${repo.full_name}${repo.description ? " — " + repo.description : ""}`;
    return {
      source: "github",
      sourceLabel: "GitHub",
      sourceQuality: 0.7,
      externalId: String(repo.id),
      title,
      url: repo.html_url,
      metric: repo.stargazers_count,
      metricKind: "estrellas en GitHub",
      topicHint: classifyTopic(`${repo.full_name} ${repo.description ?? ""} ${repo.language ?? ""}`, "Tecnología"),
      lang: "en",
    } satisfies RawCandidate;
  });
}
