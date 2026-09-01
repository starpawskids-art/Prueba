export function ageMinutesSince(timestamp: number): number {
  return Math.max(0, (Date.now() - timestamp) / 60000);
}

export function formatMinutesAgo(minutes: number): string {
  if (minutes < 1) return "hace instantes";
  if (minutes < 60) return `hace ${Math.round(minutes)} min`;
  const hours = minutes / 60;
  if (hours < 24) return `hace ${Math.round(hours)} h`;
  const days = hours / 24;
  return `hace ${Math.round(days)} d`;
}

export function confidenceLabel(confidence: string): { label: string; className: string } {
  switch (confidence) {
    case "alta":
      return { label: "Confianza alta", className: "text-[var(--confidence-alta)]" };
    case "media":
      return { label: "Confianza media", className: "text-[var(--confidence-media)]" };
    default:
      return { label: "Confianza baja", className: "text-[var(--confidence-baja)]" };
  }
}
