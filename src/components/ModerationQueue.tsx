"use client";

import { useEffect, useState } from "react";

type Report = {
  id: string;
  target_type: string;
  target_id: string;
  reason: string | null;
  created_at: number;
  targetPreview: string;
  alreadyHidden: boolean;
};

export default function ModerationQueue() {
  const [reports, setReports] = useState<Report[] | null>(null);

  async function load() {
    const res = await fetch("/api/admin/reports");
    const data = (await res.json()) as { reports: Report[] };
    setReports(data.reports);
  }

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, []);

  async function act(id: string, action: "hide" | "dismiss") {
    await fetch(`/api/admin/reports/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await load();
  }

  return (
    <div className="flex flex-col gap-2">
      {reports === null && <p className="text-xs text-muted">Cargando…</p>}
      {reports?.length === 0 && (
        <p className="text-xs text-muted">Sin reportes pendientes.</p>
      )}
      {reports?.map((r) => (
        <div key={r.id} className="rounded-xl border border-border bg-surface p-3 text-xs">
          <div className="flex items-center justify-between text-muted">
            <span>{r.target_type === "pulse" ? "Pulse" : "Comentario"}</span>
            <span>{new Date(r.created_at).toLocaleString("es-ES")}</span>
          </div>
          <p className="mt-1 line-clamp-2 text-foreground">{r.targetPreview}</p>
          {r.alreadyHidden && (
            <p className="mt-1 text-[var(--confidence-media)]">Ya oculto por otro reporte</p>
          )}
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => act(r.id, "hide")}
              className="flex-1 rounded-lg bg-[var(--confidence-baja)]/20 py-1.5 font-medium text-[var(--confidence-baja)]"
            >
              Ocultar
            </button>
            <button
              onClick={() => act(r.id, "dismiss")}
              className="flex-1 rounded-lg bg-surface-raised py-1.5 font-medium text-foreground"
            >
              Descartar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
