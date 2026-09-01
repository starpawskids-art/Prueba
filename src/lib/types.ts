export type Topic =
  | "Tecnología"
  | "Ciencia"
  | "Salud"
  | "Negocios"
  | "Política"
  | "Cultura"
  | "Videojuegos"
  | "Deportes"
  | "Medio ambiente"
  | "Educación"
  | "Mundo"
  | "Curiosidades";

export const TOPICS: Topic[] = [
  "Tecnología",
  "Ciencia",
  "Salud",
  "Negocios",
  "Política",
  "Cultura",
  "Videojuegos",
  "Deportes",
  "Medio ambiente",
  "Educación",
  "Mundo",
  "Curiosidades",
];

export type Language = "en" | "es" | "fr" | "de" | "it" | "pt";

export const DEFAULT_LANGUAGE: Language = "en";

export const LANGUAGES: Array<{ code: Language; label: string; flag: string }> = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "pt", label: "Português", flag: "🇵🇹" },
];

export function isLanguage(value: string): value is Language {
  return LANGUAGES.some((l) => l.code === value);
}

export const MAX_CUSTOM_INTERESTS = 3;

export type Confidence = "alta" | "media" | "baja";

export type SourceRef = {
  publisher: string;
  url: string;
};

export type Pulse = {
  id: string;
  title: string;
  changeText: string;
  whyItMatters: string;
  topic: Topic;
  lang: Language;
  noveltyMinutes: number;
  momentum: number;
  confidence: Confidence;
  score: number;
  sources: SourceRef[];
  detectedAt: number;
  updatedAt: number;
  matchedCustomInterest?: string;
};

export type InteractionType = "open" | "save" | "follow" | "dismiss" | "more" | "less";
