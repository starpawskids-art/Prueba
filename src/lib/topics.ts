import { Topic } from "./types";

const KEYWORDS: Array<[Topic, RegExp]> = [
  ["Tecnología", /\b(ai|llm|gpt|software|app|chip|startup|programming|open.?source|github|google|apple|microsoft|meta|robot|quantum|browser|linux|python|rust|javascript|hardware|silicon|cybersecurity|hack|data)\b/i],
  ["Ciencia", /\b(nasa|space|physics|biology|research|study|scientist|astronomy|climate|genome|vaccine|cancer|telescope|particle|ocean|species|fossil)\b/i],
  ["Negocios", /\b(ipo|acquisition|funding|startup|market|stock|revenue|ceo|merger|layoffs|earnings|valuation|economy|inflation|bank)\b/i],
  ["Política", /\b(election|president|congress|senate|government|policy|law|vote|minister|parliament|war|treaty|sanctions)\b/i],
  ["Deportes", /\b(football|soccer|nba|olympics|championship|tournament|match|league|world cup|athlete|tennis|f1|formula)\b/i],
  ["Cultura", /\b(film|movie|music|album|art|book|author|celebrity|series|game|festival|award|actor|director)\b/i],
];

export function classifyTopic(title: string, fallback: Topic): Topic {
  for (const [topic, re] of KEYWORDS) {
    if (re.test(title)) return topic;
  }
  return fallback;
}
