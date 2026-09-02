import { XMLParser, XMLValidator } from "fast-xml-parser";
import { Language, Topic } from "../types";
import { classifyTopic } from "../topics";
import { RawCandidate } from "./types";

// Real, keyless public RSS feeds from established news organizations —
// no API key needed, same "just fetch a public URL" spirit as Hacker News
// and Wikipedia. Picked for editorial reputation and (as far as we know)
// long-lived, stable feed URLs, not aggregator/SEO sites.
//
// RSS carries no numeric popularity metric like HN's score or Wikipedia's
// pageviews — the only real-world signal in a feed is its own editorial
// order (what the outlet is leading with right now). `metric` here is a
// position-based proxy derived from that order, not a fabricated number:
// see fetchRssCandidates below.
type FeedConfig = {
  id: string;
  label: string;
  url: string;
  lang: Language;
  quality: number;
  topicFallback: Topic;
};

const FEEDS: FeedConfig[] = [
  { id: "bbc-world", label: "BBC News", url: "https://feeds.bbci.co.uk/news/world/rss.xml", lang: "en", quality: 0.9, topicFallback: "Mundo" },
  { id: "npr-news", label: "NPR", url: "https://feeds.npr.org/1001/rss.xml", lang: "en", quality: 0.88, topicFallback: "Mundo" },
  { id: "aljazeera-en", label: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml", lang: "en", quality: 0.8, topicFallback: "Mundo" },
  { id: "bbc-mundo", label: "BBC Mundo", url: "https://feeds.bbci.co.uk/mundo/rss.xml", lang: "es", quality: 0.9, topicFallback: "Mundo" },
  { id: "france24-es", label: "France 24 (Español)", url: "https://www.france24.com/es/rss", lang: "es", quality: 0.82, topicFallback: "Mundo" },
  { id: "france24-fr", label: "France 24", url: "https://www.france24.com/fr/rss", lang: "fr", quality: 0.82, topicFallback: "Mundo" },
  { id: "dw-de", label: "Deutsche Welle", url: "https://rss.dw.com/rdf/rss-de-all", lang: "de", quality: 0.82, topicFallback: "Mundo" },
  { id: "ansa-it", label: "ANSA", url: "https://www.ansa.it/sito/ansait_rss.xml", lang: "it", quality: 0.78, topicFallback: "Mundo" },
  { id: "bbc-brasil", label: "BBC Brasil", url: "https://feeds.bbci.co.uk/portuguese/rss.xml", lang: "pt", quality: 0.85, topicFallback: "Mundo" },
];

const CANDIDATE_LIMIT = 30;

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

// fast-xml-parser can hand back a plain string, or (for elements with
// attributes/CDATA siblings) an object with a "#text" field — normalize
// either shape to a trimmed string.
function textOf(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object" && "#text" in value) {
    return String((value as { "#text": unknown })["#text"]).trim();
  }
  return "";
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

type FeedItem = { title: string; link: string; guid: string };

function extractItems(parsed: unknown): FeedItem[] {
  const root = parsed as Record<string, unknown>;

  // RSS 2.0 / RDF: <rss><channel><item>… or <rdf:RDF><item>…
  const channel = (root.rss as Record<string, unknown> | undefined)?.channel as
    | Record<string, unknown>
    | undefined;
  const rssItems = asArray(channel?.item as Record<string, unknown> | Record<string, unknown>[] | undefined);
  const rdfItems = asArray(
    (root["rdf:RDF"] as Record<string, unknown> | undefined)?.item as
      | Record<string, unknown>
      | Record<string, unknown>[]
      | undefined
  );

  // Atom fallback, in case an outlet serves <feed><entry> instead of RSS.
  const atomEntries = asArray(
    (root.feed as Record<string, unknown> | undefined)?.entry as
      | Record<string, unknown>
      | Record<string, unknown>[]
      | undefined
  );

  const rawItems = rssItems.length ? rssItems : rdfItems.length ? rdfItems : atomEntries;

  return rawItems
    .map((item) => {
      const title = textOf(item.title);
      let link = textOf(item.link);
      if (!link && item.link && typeof item.link === "object") {
        // Atom: <link href="…"/>
        link = textOf((item.link as Record<string, unknown>)["@_href"]);
      }
      const guid = textOf(item.guid) || textOf(item.id) || link;
      return { title, link, guid };
    })
    .filter((item) => item.title && item.link);
}

// Exported per-feed rather than as one aggregate fetch: run.ts adds one
// sourceFns entry per feed (same pattern as Wikipedia's per-language
// LANGUAGES.map), so a single stale feed URL shows up as its own labeled
// error in the ingest log instead of being swallowed into a generic "RSS"
// bucket.
export async function fetchRssFeed(feed: FeedConfig): Promise<RawCandidate[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  let xml: string;
  try {
    const res = await fetch(feed.url, {
      signal: controller.signal,
      headers: { "User-Agent": "PulseApp/0.1 (product research MVP)" },
    });
    if (!res.ok) throw new Error(`RSS (${feed.label}) request failed: ${res.status}`);
    xml = await res.text();
  } finally {
    clearTimeout(timer);
  }

  // fast-xml-parser doesn't throw on malformed input by default — it just
  // silently returns a mostly-empty object, which would make a broken feed
  // URL (moved, returns an HTML error page, etc.) look like "0 items today"
  // instead of a visible error. Validate first so that failure mode shows
  // up in the ingest log like every other source's errors do.
  const validation = XMLValidator.validate(xml);
  if (validation !== true) {
    throw new Error(`RSS (${feed.label}) invalid XML: ${validation.err.msg}`);
  }

  const parsed = parser.parse(xml);
  const items = extractItems(parsed).slice(0, CANDIDATE_LIMIT);

  return items.map((item, index) => ({
    source: feed.id,
    sourceLabel: feed.label,
    sourceQuality: feed.quality,
    externalId: item.guid,
    title: item.title,
    url: item.link,
    // Position in the outlet's own editorial order, decaying down the
    // list — the best available proxy for "how prominent is this right
    // now" that a plain RSS feed exposes.
    metric: Math.max(1, CANDIDATE_LIMIT - index) * 3,
    metricKind: "posición en portada",
    topicHint: classifyTopic(item.title, feed.lang, feed.topicFallback),
    lang: feed.lang,
  }));
}

export const RSS_FEEDS = FEEDS;
export type { FeedConfig };
