"use client";

import { useEffect, useState } from "react";
import { Pulse } from "@/lib/types";
import PulseCard from "./PulseCard";

export default function CollectionView({
  title,
  subtitle,
  field,
  emptyText,
}: {
  title: string;
  subtitle: string;
  field: "saved" | "following";
  emptyText: string;
}) {
  const [items, setItems] = useState<Pulse[] | null>(null);

  useEffect(() => {
    fetch("/api/interactions")
      .then((res) => res.json())
      .then((data: { saved: Pulse[]; following: Pulse[] }) => setItems(data[field]))
      .catch(() => setItems([]));
  }, [field]);

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 pb-6 pt-5">
      <header>
        <h1 className="text-xl font-bold">{title}</h1>
        <p className="text-sm text-muted">{subtitle}</p>
      </header>

      {!items && <div className="py-16 text-center text-sm text-muted">Cargando…</div>}
      {items && items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">
          {emptyText}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {items?.map((pulse) => (
          <PulseCard key={pulse.id} pulse={pulse} />
        ))}
      </div>
    </div>
  );
}
