import { RawCandidate } from "../sources/types";

function tokenize(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2)
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const t of a) if (b.has(t)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

const SIMILARITY_THRESHOLD = 0.6;

// Cross-source dedup: two candidates covering the same real-world story
// (near-identical title tokens) are merged, keeping the one from the
// higher-quality source and folding the other in as an extra source ref.
export function dedupeCandidates(
  candidates: RawCandidate[]
): Array<RawCandidate & { mergedFrom: RawCandidate[] }> {
  const withTokens = candidates.map((c) => ({ c, tokens: tokenize(c.title) }));
  const kept: Array<RawCandidate & { mergedFrom: RawCandidate[] }> = [];

  for (const { c, tokens } of withTokens) {
    // Never merge across languages — similar tokens across editions (e.g.
    // shared proper nouns) don't mean the same summarized story.
    const match = kept.find(
      (k) => k.lang === c.lang && jaccard(tokenize(k.title), tokens) >= SIMILARITY_THRESHOLD
    );
    if (match) {
      if (c.sourceQuality > match.sourceQuality) {
        const previous: RawCandidate = { ...match };
        match.mergedFrom.push(previous);
        Object.assign(match, c);
      } else {
        match.mergedFrom.push(c);
      }
    } else {
      kept.push({ ...c, mergedFrom: [] });
    }
  }
  return kept;
}
