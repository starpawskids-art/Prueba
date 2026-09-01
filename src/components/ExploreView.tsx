"use client";

import { useEffect, useState } from "react";
import { Pulse, TOPICS, Topic } from "@/lib/types";
import PulseCard from "./PulseCard";

export default function ExploreView() {
  const [pulses, setPulses] = useState<Pulse[] | null>(null);
  const [filter, setFilter] = useState<Topic | null>(null);

  useEffect(() => {
    fetch("/api/pulses?limit=40")
      .then((res) => res.json())
      .then((data: { pulses: Pulse[] }) => setPulses(data.pulses))
      .catch(() => setPulses([]));
  }, []);

  const visible = pulses?.filter((p) => !filter || p.topic === filter) ?? [];

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 pb-6 pt-5">
      <header>
        <h1 className="text-xl font-bold">Explorar</h1>
        <p className="text-sm text-muted">Todo lo que estamos siguiendo ahora mismo, por tema.</p>
      </header>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter(null)}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
            !filter ? "border-accent bg-accent text-white" : "border-border bg-surface text-foreground"
          }`}
        >
          Todo
        </button>
        {TOPICS.map((topic) => (
          <button
            key={topic}
            onClick={() => setFilter(topic)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
              filter === topic
                ? "border-accent bg-accent text-white"
                : "border-border bg-surface text-foreground"
            }`}
          >
            {topic}
          </button>
        ))}
      </div>

      {!pulses && <div className="py-16 text-center text-sm text-muted">Cargando señales…</div>}
      {pulses && visible.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">
          Nada por aquí todavía en este tema.
        </div>
      )}

      <div className="flex flex-col gap-3">
        {visible.map((pulse) => (
          <PulseCard key={pulse.id} pulse={pulse} />
        ))}
      </div>
    </div>
  );
}
