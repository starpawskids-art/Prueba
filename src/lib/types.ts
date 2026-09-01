export type Topic =
  | "Tecnología"
  | "Ciencia"
  | "Negocios"
  | "Política"
  | "Cultura"
  | "Deportes"
  | "Mundo"
  | "Curiosidades";

export const TOPICS: Topic[] = [
  "Tecnología",
  "Ciencia",
  "Negocios",
  "Política",
  "Cultura",
  "Deportes",
  "Mundo",
  "Curiosidades",
];

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
  noveltyMinutes: number;
  momentum: number;
  confidence: Confidence;
  score: number;
  sources: SourceRef[];
  detectedAt: number;
  updatedAt: number;
};

export type InteractionType = "open" | "save" | "follow" | "dismiss" | "more" | "less";
