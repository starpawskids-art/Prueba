"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TOPICS, Topic } from "@/lib/types";

const MIN_INTERESTS = 3;

export default function OnboardingPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<Topic[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function toggle(topic: Topic) {
    setSelected((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  }

  async function handleContinue() {
    setSubmitting(true);
    try {
      await fetch("/api/interests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interests: selected }),
      });
      router.push("/");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col justify-between px-6 py-10">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold tracking-wide text-accent">PULSE</span>
          <h1 className="text-2xl font-bold leading-tight">¿Qué te interesa seguir?</h1>
          <p className="text-sm text-muted">
            Elige {MIN_INTERESTS} o más. Usaremos esto para priorizar tu feed — y aun así te
            enseñaremos algo fuera de tu radar de vez en cuando.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {TOPICS.map((topic) => {
            const active = selected.includes(topic);
            return (
              <button
                key={topic}
                onClick={() => toggle(topic)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
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

      <button
        disabled={selected.length < MIN_INTERESTS || submitting}
        onClick={handleContinue}
        className="rounded-xl bg-accent py-3.5 text-center text-sm font-semibold text-white disabled:opacity-40"
      >
        {selected.length < MIN_INTERESTS
          ? `Elige al menos ${MIN_INTERESTS - selected.length} más`
          : submitting
            ? "Entrando…"
            : "Entrar a PULSE"}
      </button>
    </div>
  );
}
