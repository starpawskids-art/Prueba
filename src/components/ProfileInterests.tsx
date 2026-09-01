"use client";

import { useState } from "react";
import { LANGUAGES, Language, MAX_CUSTOM_INTERESTS, TOPICS, Topic } from "@/lib/types";

export default function ProfileInterests({
  initialInterests,
  initialCustomInterests,
  initialLanguage,
}: {
  initialInterests: string[];
  initialCustomInterests: string[];
  initialLanguage: Language;
}) {
  const [selected, setSelected] = useState<Topic[]>(initialInterests as Topic[]);
  const [customInterests, setCustomInterestsState] = useState<string[]>(initialCustomInterests);
  const [customDraft, setCustomDraft] = useState("");
  const [customError, setCustomError] = useState<string | null>(null);
  const [language, setLanguageState] = useState<Language>(initialLanguage);
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

  async function addCustomInterest() {
    const value = customDraft.trim();
    if (!value) return;
    if (customInterests.length >= MAX_CUSTOM_INTERESTS) {
      setCustomError(`Máximo ${MAX_CUSTOM_INTERESTS} temas personalizados.`);
      return;
    }
    const next = [...customInterests, value];
    const res = await fetch("/api/interests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customInterests: next }),
    });
    const data = (await res.json()) as {
      customInterests: string[];
      rejected: Array<{ value: string; reason: string }>;
    };
    if (data.rejected.length > 0) {
      setCustomError(`No pudimos añadir "${data.rejected[0].value}": ${data.rejected[0].reason}`);
    } else {
      setCustomDraft("");
      setCustomError(null);
    }
    setCustomInterestsState(data.customInterests);
  }

  async function removeCustomInterest(value: string) {
    const next = customInterests.filter((v) => v !== value);
    setCustomInterestsState(next);
    await fetch("/api/interests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customInterests: next }),
    });
  }

  async function changeLanguage(lang: Language) {
    setLanguageState(lang);
    await fetch("/api/language", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: lang }),
    });
  }

  return (
    <div className="flex flex-col gap-6">
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

      <div>
        <h2 className="text-sm font-semibold text-muted">Temas personalizados</h2>
        <div className="mt-2 flex gap-2">
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
        {customError && <p className="mt-1 text-xs text-[var(--confidence-baja)]">{customError}</p>}
        {customInterests.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
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

      <div>
        <h2 className="text-sm font-semibold text-muted">Idioma</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => changeLanguage(l.code)}
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
  );
}
