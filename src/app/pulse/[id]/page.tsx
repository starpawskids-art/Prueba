import Link from "next/link";
import { notFound } from "next/navigation";
import { getPulseById } from "@/lib/pipeline/rank";
import { ageMinutesSince, confidenceLabel, formatMinutesAgo } from "@/lib/format";
import PulseDetailActions from "@/components/PulseDetailActions";
import ReportButton from "@/components/ReportButton";
import CommentsSection from "@/components/CommentsSection";

export default async function PulseDetailPage({ params }: PageProps<"/pulse/[id]">) {
  const { id } = await params;
  const pulse = getPulseById(id);
  if (!pulse) notFound();

  const confidence = confidenceLabel(pulse.confidence);
  const ageMinutes = ageMinutesSince(pulse.detectedAt);

  return (
    <div className="flex flex-1 flex-col gap-5 px-4 pb-8 pt-5">
      <Link href="/" className="text-sm text-muted">
        ← Volver
      </Link>

      <div className="flex items-center justify-between text-xs">
        <span className="rounded-full bg-accent-soft px-2 py-0.5 font-medium text-accent">
          {pulse.topic}
        </span>
        <div className="flex items-center gap-2">
          <span className={confidence.className}>{confidence.label}</span>
          <ReportButton targetType="pulse" targetId={pulse.id} />
        </div>
      </div>

      <h1 className="text-2xl font-bold leading-tight">{pulse.title}</h1>

      <div className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/15 to-transparent p-4">
        <p className="flex items-center gap-1.5 text-sm font-medium text-accent">
          <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-accent" />
          {pulse.changeText}
        </p>
        <p className="mt-1 text-xs text-muted">Detectado {formatMinutesAgo(ageMinutes)}</p>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-muted">Por qué importa</h2>
        <p className="mt-1 text-base leading-relaxed">{pulse.whyItMatters}</p>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-muted">Fuentes</h2>
        <ul className="mt-2 flex flex-col gap-2">
          {pulse.sources.map((source, i) => (
            <li key={i}>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-2.5 text-sm"
              >
                <span>{source.publisher}</span>
                <span className="text-muted">↗</span>
              </a>
            </li>
          ))}
        </ul>
      </div>

      <p className="rounded-xl bg-surface px-3 py-2.5 text-xs text-muted">
        Resumen generado automáticamente a partir de los datos de origen. No sustituye a la
        fuente original.
      </p>

      <PulseDetailActions pulseId={pulse.id} sourceUrl={pulse.sources[0]?.url} title={pulse.title} />

      <div className="border-t border-border pt-4">
        <CommentsSection pulseId={pulse.id} />
      </div>
    </div>
  );
}
