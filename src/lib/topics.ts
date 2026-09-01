import { Topic } from "./types";

// Ordered by specificity — more specific/unambiguous patterns first, since
// classifyTopic returns on the first match.
const KEYWORDS: Array<[Topic, RegExp]> = [
  ["Videojuegos", /\b(video ?game|gaming|xbox|playstation|ps5|nintendo|steam|esports|twitch streamer)\b/i],
  ["Salud", /\b(health|disease|virus|outbreak|hospital|surgery|mental health|nutrition|obesity|diabetes|who\b|pandemic)\b/i],
  ["Medio ambiente", /\b(climate change|wildfire|drought|deforestation|emissions|renewable|biodiversity|pollution|extinction|sustainab)\b/i],
  ["Educación", /\b(university|school|student|curriculum|professor|scholarship|classroom|tuition|academic)\b/i],
  ["Tecnología", /\b(ai|llm|gpt|software|app|chip|startup|programming|open.?source|github|google|apple|microsoft|meta|robot|quantum|browser|linux|python|rust|javascript|hardware|silicon|cybersecurity|hack|data)\b/i],
  ["Ciencia", /\b(nasa|space|physics|biology|research|study|scientist|astronomy|genome|vaccine|cancer|telescope|particle|ocean|species|fossil)\b/i],
  ["Negocios", /\b(ipo|acquisition|funding|startup|market|stock|revenue|ceo|merger|layoffs|earnings|valuation|economy|inflation|bank)\b/i],
  ["Política", /\b(election|president|congress|senate|government|policy|law|vote|minister|parliament|war|treaty|sanctions)\b/i],
  ["Deportes", /\b(football|soccer|nba|olympics|championship|tournament|match|league|world cup|athlete|tennis|f1|formula)\b/i],
  ["Cultura", /\b(film|movie|music|album|art|book|author|celebrity|series|festival|award|actor|director)\b/i],
];

export function classifyTopic(title: string, fallback: Topic): Topic {
  for (const [topic, re] of KEYWORDS) {
    if (re.test(title)) return topic;
  }
  return fallback;
}
