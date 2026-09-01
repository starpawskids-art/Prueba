"use client";

import { useEffect, useState } from "react";
import { Pulse } from "@/lib/types";
import PulseCard from "./PulseCard";

type RankedPulse = Pulse & { isExploration: boolean };

type VisitInfo = { changesSince: number; isFirstVisit: boolean };

export default function FeedView() {
  const [visit, setVisit] = useState<VisitInfo | null>(null);
  const [pulses, setPulses] = useState<RankedPulse[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const visitRes = await fetch("/api/visit", { method: "POST" });
        const visitData = (await visitRes.json()) as VisitInfo;
        if (!cancelled) setVisit(visitData);

        const pulsesRes = await fetch("/api/pulses?limit=10");
        const pulsesData = (await pulsesRes.json()) as { pulses: RankedPulse[] };
        if (!cancelled) setPulses(pulsesData.pulses);
      } catch {
        if (!cancelled) setError("No hemos podido conectar con PULSE. Reintenta en unos segundos.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 pb-6 pt-5">
      <header className="flex items-center justify-between">
        <span className="text-sm font-semibold tracking-wide text-muted">PULSE</span>
      </header>

      <ChangesBanner visit={visit} />

      {error && <p className="rounded-xl bg-surface p-4 text-sm text-[var(--confidence-baja)]">{error}</p>}

      {!pulses && !error && (
        <div className="flex flex-1 items-center justify-center py-16 text-sm text-muted">
          Escaneando el mundo…
        </div>
      )}

      {pulses && pulses.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">
          Todavía no hay señales nuevas. PULSE revisa el mundo cada pocos minutos — vuelve enseguida.
        </div>
      )}

      <div className="flex flex-col gap-3">
        {pulses?.map((pulse) => (
          <PulseCard key={pulse.id} pulse={pulse} isExploration={pulse.isExploration} />
        ))}
      </div>
    </div>
  );
}

function ChangesBanner({ visit }: { visit: VisitInfo | null }) {
  if (!visit) {
    return <div className="h-16 animate-pulse rounded-2xl bg-surface" />;
  }

  if (visit.isFirstVisit) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-accent/20 to-transparent border border-accent/30 p-4">
        <p className="text-base font-semibold">Bienvenido a PULSE</p>
        <p className="text-sm text-muted">Esto es lo que está cambiando en el mundo ahora mismo.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-accent/20 to-transparent border border-accent/30 p-4">
      <p className="text-2xl font-bold text-foreground">
        {visit.changesSince} cambio{visit.changesSince !== 1 ? "s" : ""}
      </p>
      <p className="text-sm text-muted">relevante{visit.changesSince !== 1 ? "s" : ""} desde tu última visita</p>
    </div>
  );
}
