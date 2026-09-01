"use client";

import { useEffect, useState } from "react";

type Run = {
  id: number;
  started_at: number;
  finished_at: number | null;
  signals_seen: number;
  pulses_generated: number;
  error: string | null;
};

type Status = { runs: Run[]; signalCount: number; pulseCount: number };

export default function AdminPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [running, setRunning] = useState(false);

  async function load() {
    const res = await fetch("/api/ingest");
    setStatus(await res.json());
  }

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/ingest");
      setStatus(await res.json());
    })();
  }, []);

  async function triggerRun() {
    setRunning(true);
    try {
      await fetch("/api/ingest", { method: "POST" });
      await load();
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border bg-surface py-3 text-center">
          <p className="text-lg font-bold">{status?.signalCount ?? "—"}</p>
          <p className="text-[11px] text-muted">señales rastreadas</p>
        </div>
        <div className="rounded-xl border border-border bg-surface py-3 text-center">
          <p className="text-lg font-bold">{status?.pulseCount ?? "—"}</p>
          <p className="text-[11px] text-muted">pulses generadas</p>
        </div>
      </div>

      <button
        onClick={triggerRun}
        disabled={running}
        className="rounded-xl bg-accent py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {running ? "Ejecutando ingesta…" : "Ejecutar ingesta ahora"}
      </button>

      <div>
        <h2 className="text-sm font-semibold text-muted">Últimas ejecuciones</h2>
        <div className="mt-2 flex flex-col gap-2">
          {status?.runs.map((run) => (
            <div key={run.id} className="rounded-xl border border-border bg-surface p-3 text-xs">
              <div className="flex justify-between">
                <span>{new Date(run.started_at).toLocaleTimeString("es-ES")}</span>
                <span className="text-muted">
                  {run.finished_at ? `${run.finished_at - run.started_at}ms` : "en curso"}
                </span>
              </div>
              <p className="mt-1 text-muted">
                {run.signals_seen} señales · {run.pulses_generated} pulses
              </p>
              {run.error && <p className="mt-1 text-[var(--confidence-baja)]">{run.error}</p>}
            </div>
          ))}
          {status?.runs.length === 0 && (
            <p className="text-xs text-muted">Todavía no se ha ejecutado ninguna ingesta.</p>
          )}
        </div>
      </div>
    </div>
  );
}
