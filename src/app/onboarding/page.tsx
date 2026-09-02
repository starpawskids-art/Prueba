"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LANGUAGES, Language, MAX_CUSTOM_INTERESTS, TOPICS, Topic } from "@/lib/types";
import Logo from "@/components/Logo";

const MIN_INTERESTS = 3;

export default function OnboardingPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<Topic[]>([]);
  const [customInterests, setCustomInterests] = useState<string[]>([]);
  const [customDraft, setCustomDraft] = useState("");
  const [customError, setCustomError] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>("en");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function toggle(topic: Topic) {
    setSelected((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  }

  function addCustomInterest() {
    const value = customDraft.trim();
    if (!value) return;
    if (customInterests.length >= MAX_CUSTOM_INTERESTS) {
      setCustomError(`Máximo ${MAX_CUSTOM_INTERESTS} temas personalizados.`);
      return;
    }
    setCustomInterests((prev) => [...prev, value]);
    setCustomDraft("");
    setCustomError(null);
  }

  function removeCustomInterest(value: string) {
    setCustomInterests((prev) => prev.filter((v) => v !== value));
  }

  async function handleContinue() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/interests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interests: selected, customInterests, language }),
      });
      const data = (await res.json()) as {
        rejected?: Array<{ value: string; reason: string }>;
      };
      if (data.rejected && data.rejected.length > 0) {
        setSubmitError(
          `No pudimos añadir "${data.rejected[0].value}": ${data.rejected[0].reason}`
        );
        setCustomInterests((prev) => prev.filter((v) => !data.rejected!.some((r) => r.value === v)));
        return;
      }
      router.push("/");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-6 py-10">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <Logo size={32} variant="full" />
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

          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-muted">¿Algo más específico?</h2>
            <p className="text-xs text-muted">
              Escribe cualquier tema y lo añadiremos a tu radar (hasta {MAX_CUSTOM_INTERESTS}).
            </p>
            <div className="flex gap-2">
              <input
                value={customDraft}
                onChange={(e) => {
                  setCustomDraft(e.target.value);
                  setCustomError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomInterest();
                  }
                }}
                placeholder="p. ej. Fórmula E"
                maxLength={40}
                className="flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
              />
              <button
                onClick={addCustomInterest}
                disabled={!customDraft.trim()}
                className="rounded-xl bg-surface-raised px-4 py-2 text-sm font-medium disabled:opacity-40"
              >
                Añadir
              </button>
            </div>
            {customError && <p className="text-xs text-[var(--confidence-baja)]">{customError}</p>}
            {customInterests.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {customInterests.map((interest) => (
                  <button
                    key={interest}
                    onClick={() => removeCustomInterest(interest)}
                    className="flex items-center gap-1.5 rounded-full border border-accent bg-accent-soft px-3 py-1.5 text-xs font-medium text-accent"
                  >
                    {interest} <span aria-hidden>×</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-muted">Idioma</h2>
            <p className="text-xs text-muted">Si no eliges ninguno, PULSE se muestra en inglés.</p>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLanguage(l.code)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                    language === l.code
                      ? "border-accent bg-accent text-white"
                      : "border-border bg-surface text-foreground"
                  }`}
                >
                  {l.flag} {l.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border px-6 py-4">
        {submitError && <p className="mb-2 text-xs text-[var(--confidence-baja)]">{submitError}</p>}
        <button
          disabled={selected.length < MIN_INTERESTS || submitting}
          onClick={handleContinue}
          className="w-full rounded-xl bg-accent py-3.5 text-center text-sm font-semibold text-white disabled:opacity-40"
        >
          {selected.length < MIN_INTERESTS
            ? `Elige al menos ${MIN_INTERESTS - selected.length} más`
            : submitting
              ? "Entrando…"
              : "Entrar a PULSE"}
        </button>
      </div>
    </div>
  );
}
