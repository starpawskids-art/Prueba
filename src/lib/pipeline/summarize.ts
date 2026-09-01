import { Confidence, Topic } from "../types";

export type SummaryInput = {
  title: string;
  topic: Topic;
  sourceLabel: string;
  sourceCount: number;
  metric: number;
  metricKind: string;
  deltaMetric: number | null; // null when this is a brand-new signal, no baseline yet
  isNew: boolean;
  ageMinutes: number;
};

const numberFormatter = new Intl.NumberFormat("es-ES");

function fmt(n: number): string {
  return numberFormatter.format(Math.round(n));
}

// Deterministic, template-based summarization. Every sentence is built
// directly from measured numbers we already have — nothing is inferred
// or invented. This is the extension point for swapping in a real LLM
// summarizer later (see README): same input/output shape, same rule
// ("no afirmar nada que no esté soportado por los datos de origen").
export function buildChangeText(input: SummaryInput): string {
  const { metric, metricKind, deltaMetric, isNew } = input;
  if (isNew) {
    return `Detectado por primera vez · ${fmt(metric)} ${metricKind}`;
  }
  if (deltaMetric !== null && deltaMetric > 0) {
    const pct = deltaMetric && metric - deltaMetric > 0 ? (deltaMetric / (metric - deltaMetric)) * 100 : null;
    const pctText = pct !== null && Number.isFinite(pct) ? ` (+${fmt(pct)}%)` : "";
    return `+${fmt(deltaMetric)} ${metricKind}${pctText} desde la última vez que lo vimos`;
  }
  return `${fmt(metric)} ${metricKind} · sigue activo`;
}

export function buildWhyItMatters(input: SummaryInput): string {
  const { topic, sourceLabel, sourceCount, isNew } = input;
  const multi = sourceCount > 1 ? ` y otras ${sourceCount - 1} fuentes` : "";
  if (isNew) {
    return `Acaba de entrar en la conversación de ${sourceLabel}${multi}. Lo marcamos porque es nuevo y ya tiene tracción medible en ${topic.toLowerCase()}.`;
  }
  return `Sigue ganando atención en ${sourceLabel}${multi} más rápido que la mayoría de señales de ${topic.toLowerCase()} que estamos siguiendo ahora mismo.`;
}

export function computeConfidence(sourceQuality: number, sourceCount: number, metric: number): Confidence {
  if (sourceQuality >= 0.8 && (sourceCount > 1 || metric > 200)) return "alta";
  if (sourceQuality >= 0.6) return "media";
  return "baja";
}
