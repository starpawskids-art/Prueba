"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Activity = {
  commentId: string;
  pulseId: string;
  pulseTitle: string;
  body: string;
  createdAt: number;
  author: { userId: string; name: string; username: string | null };
};
type Person = { userId: string; name: string; username: string | null };

function timeAgo(ts: number): string {
  const minutes = Math.max(0, (Date.now() - ts) / 60000);
  if (minutes < 1) return "hace instantes";
  if (minutes < 60) return `hace ${Math.round(minutes)} min`;
  const hours = minutes / 60;
  if (hours < 24) return `hace ${Math.round(hours)} h`;
  return `hace ${Math.round(hours / 24)} d`;
}

export default function PeopleActivityFeed() {
  const [data, setData] = useState<{ activity: Activity[]; people: Person[] } | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/social/activity");
      setData(await res.json());
    })();
  }, []);

  if (!data) return <div className="py-16 text-center text-sm text-muted">Cargando…</div>;

  if (data.people.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">
        Todavía no sigues a nadie. Sigue a alguien desde su perfil público (por ejemplo, cuando
        comente en una Pulse) para ver aquí lo que aporta.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {data.people.map((p) =>
          p.username ? (
            <Link
              key={p.userId}
              href={`/u/${p.username}`}
              className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium"
            >
              {p.name}
            </Link>
          ) : (
            <span key={p.userId} className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs">
              {p.name}
            </span>
          )
        )}
      </div>

      {data.activity.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">
          La gente que sigues todavía no ha aportado contexto en ninguna Pulse.
        </div>
      )}

      <div className="flex flex-col gap-3">
        {data.activity.map((a) => (
          <Link
            key={a.commentId}
            href={`/pulse/${a.pulseId}`}
            className="block rounded-2xl border border-border bg-surface p-4"
          >
            <div className="flex items-center justify-between text-xs text-muted">
              <span className="font-medium text-foreground">{a.author.name}</span>
              <span>{timeAgo(a.createdAt)}</span>
            </div>
            <p className="mt-1 text-xs text-muted line-clamp-1">{a.pulseTitle}</p>
            <p className="mt-1 text-sm text-foreground">{a.body}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
