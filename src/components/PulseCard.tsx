"use client";

import Link from "next/link";
import { useState } from "react";
import { Pulse } from "@/lib/types";
import { confidenceLabel, formatMinutesAgo } from "@/lib/format";

async function sendInteraction(pulseId: string, type: string) {
  try {
    await fetch("/api/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pulseId, type }),
    });
  } catch {
    // best-effort; UI already reflects the action optimistically
  }
}

export default function PulseCard({
  pulse,
  isExploration,
  onDismiss,
}: {
  pulse: Pulse;
  isExploration?: boolean;
  onDismiss?: (id: string) => void;
}) {
  const [saved, setSaved] = useState(false);
  const [following, setFollowing] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const confidence = confidenceLabel(pulse.confidence);

  if (dismissed) return null;

  return (
    <article className="rounded-2xl border border-border bg-surface p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-accent-soft px-2 py-0.5 font-medium text-accent">
            {pulse.topic}
          </span>
          {isExploration && (
            <span className="rounded-full border border-border px-2 py-0.5 text-muted">
              Descubrimiento
            </span>
          )}
          {pulse.matchedCustomInterest && (
            <span className="rounded-full border border-accent/40 px-2 py-0.5 text-accent">
              Por &quot;{pulse.matchedCustomInterest}&quot;
            </span>
          )}
        </div>
        <span className={confidence.className}>{confidence.label}</span>
      </div>

      <Link href={`/pulse/${pulse.id}`} className="flex flex-col gap-1.5">
        <h2 className="text-lg font-semibold leading-snug text-foreground">{pulse.title}</h2>
        <p className="flex items-center gap-1.5 text-sm text-accent">
          <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-accent" />
          {pulse.changeText}
        </p>
        <p className="text-sm text-muted line-clamp-2">{pulse.whyItMatters}</p>
      </Link>

      <div className="flex items-center justify-between text-xs text-muted">
        <span>{formatMinutesAgo(pulse.noveltyMinutes)}</span>
        <span>{pulse.sources.length} fuente{pulse.sources.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="flex items-center gap-2 border-t border-border pt-3 text-xs">
        <button
          onClick={() => {
            setSaved((s) => !s);
            sendInteraction(pulse.id, "save");
          }}
          className={`flex-1 rounded-lg py-1.5 font-medium transition-colors ${
            saved ? "bg-accent text-white" : "bg-surface-raised text-foreground"
          }`}
        >
          {saved ? "Guardado" : "Guardar"}
        </button>
        <button
          onClick={() => {
            setFollowing((f) => !f);
            sendInteraction(pulse.id, "follow");
          }}
          className={`flex-1 rounded-lg py-1.5 font-medium transition-colors ${
            following ? "bg-accent text-white" : "bg-surface-raised text-foreground"
          }`}
        >
          {following ? "Siguiendo" : "Seguir"}
        </button>
        <button
          onClick={async () => {
            if (navigator.share) {
              try {
                await navigator.share({ title: pulse.title, url: pulse.sources[0]?.url ?? "" });
              } catch {
                // user cancelled share sheet
              }
            }
            sendInteraction(pulse.id, "open");
          }}
          className="flex-1 rounded-lg bg-surface-raised py-1.5 font-medium text-foreground"
        >
          Compartir
        </button>
        <button
          onClick={() => {
            setDismissed(true);
            onDismiss?.(pulse.id);
            sendInteraction(pulse.id, "dismiss");
          }}
          className="flex-1 rounded-lg bg-surface-raised py-1.5 font-medium text-muted"
        >
          No me interesa
        </button>
      </div>
    </article>
  );
}
