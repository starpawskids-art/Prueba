"use client";

import { useState } from "react";
import { TOPICS, Topic } from "@/lib/types";

export default function ProfileInterests({ initialInterests }: { initialInterests: string[] }) {
  const [selected, setSelected] = useState<Topic[]>(initialInterests as Topic[]);
  const [saved, setSaved] = useState(false);

  async function toggle(topic: Topic) {
    const next = selected.includes(topic)
      ? selected.filter((t) => t !== topic)
      : [...selected, topic];
    setSelected(next);
    setSaved(false);
    await fetch("/api/interests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interests: next }),
    });
    setSaved(true);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted">Tus intereses</h2>
        {saved && <span className="text-xs text-accent">Guardado</span>}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {TOPICS.map((topic) => {
          const active = selected.includes(topic);
          return (
            <button
              key={topic}
              onClick={() => toggle(topic)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "border-accent bg-accent text-white"
                  : "border-border bg-surface text-foreground"
              }`}
            >
              {topic}
            </button>
          );
        })}
      </div>
    </div>
  );
}
