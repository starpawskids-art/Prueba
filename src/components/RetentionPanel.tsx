"use client";

import { useEffect, useState } from "react";

type Retention = { day: number; cohortSize: number; retainedCount: number; retentionRate: number };
type Overview = {
  totalUsers: number;
  totalVisits: number;
  visitsLast24h: number;
  avgSessionsPerActiveUserLast7d: number;
};
type Data = { overview: Overview; retention: Retention[] };

// Targets from the product doc's own validation goals (section 16).
const TARGETS: Record<number, string> = { 1: ">35%", 7: ">15–20%", 30: ">8–12%" };

export default function RetentionPanel() {
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/retention");
      setData(await res.json());
    })();
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2">
        <Stat label="usuarios totales" value={data?.overview.totalUsers} />
        <Stat label="visitas (24h)" value={data?.overview.visitsLast24h} />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-muted">Retención por cohorte</h2>
        <p className="text-xs text-muted">
          % de usuarios que abrieron la app exactamente ese día tras registrarse — no acumulado.
          Solo cuenta cohortes ya lo bastante maduras.
        </p>
        <div className="mt-2 flex flex-col gap-2">
          {data?.retention.map((r) => (
            <div key={r.day} className="rounded-xl border border-border bg-surface p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold">D{r.day}</span>
                <span className="text-muted">objetivo doc: {TARGETS[r.day]}</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-lg font-bold">
                  {r.cohortSize > 0 ? `${Math.round(r.retentionRate * 100)}%` : "—"}
                </span>
                <span className="text-muted">
                  {r.retainedCount}/{r.cohortSize} en cohorte
                </span>
              </div>
            </div>
          ))}
          {data?.retention.every((r) => r.cohortSize === 0) && (
            <p className="text-xs text-muted">
              Todavía no hay cohortes maduras (necesitas usuarios con ≥1 día de antigüedad).
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="rounded-xl border border-border bg-surface py-3 text-center">
      <p className="text-lg font-bold">{value ?? "—"}</p>
      <p className="text-[11px] text-muted">{label}</p>
    </div>
  );
}
