import { Language, Topic } from "../types";

export type RawCandidate = {
  source: string;
  sourceLabel: string;
  sourceQuality: number; // 0-1 static reliability score for CalidadFuente
  externalId: string;
  title: string;
  url: string;
  metric: number; // raw popularity/engagement metric, comparable within the same source
  metricKind: string; // human label for what `metric` represents, used in change_text
  topicHint: Topic;
  lang: Language;
};
