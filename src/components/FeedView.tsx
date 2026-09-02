"use client";

import { useEffect, useState } from "react";
import { LANGUAGES, Language, Pulse } from "@/lib/types";
import PulseCard from "./PulseCard";
import Logo from "./Logo";

type RankedPulse = Pulse & { isExploration: boolean };

type VisitInfo = { changesSince: number; isFirstVisit: boolean };

async function fetchFeedData(): Promise<{
  language: Language;
  visit: VisitInfo;
  pulses: RankedPulse[];
}> {
  const langRes = await fetch("/api/language");
  const { language } = (await langRes.json()) as { language: Language };

  const visitRes = await fetch("/api/visit", { method: "POST" });
  const visit = (await visitRes.json()) as VisitInfo;

  const pulsesRes = await fetch("/api/pulses?limit=10");
  const { pulses } = (await pulsesRes.json()) as { pulses: RankedPulse[] };

  return { language, visit, pulses };
}

export default function FeedView() {
  const [language, setLanguage] = useState<Language | null>(null);
  const [visit, setVisit] = useState<VisitInfo | null>(null);
  const [pulses, setPulses] = useState<RankedPulse[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchFeedData();
        setLanguage(data.language);
        setVisit(data.visit);
        setPulses(data.pulses);
      } catch {
        setError("No hemos podido conectar con PULSE. Reintenta en unos segundos.");
      }
    })();
  }, []);

  async function changeLanguage(next: Language) {
    if (next === language) return;
    setLanguage(next);
    setPulses(null);
    await fetch("/api/language", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: next }),
    });
    try {
      const data = await fetchFeedData();
      setLanguage(data.language);
      setVisit(data.visit);
      setPulses(data.pulses);
    } catch {
      setError("No hemos podido conectar con PULSE. Reintenta en unos segundos.");
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 pb-6 pt-5">
      <header className="flex items-center justify-between">
        <Logo size={28} variant="full" />
        {language && <LanguageSwitcher language={language} onChange={changeLanguage} />}
      </header>

      <ChangesBanner visit={visit} />

      {error && <p className="rounded-xl bg-surface p-4 text-sm text-[var(--confidence-baja)]">{error}</p>}

      {!pulses && !error && (
        <div className="flex flex-1 items-center justify-center py-16 text-sm text-muted">
          Escaneando el mundo…
        </div>
      )}

      {pulses && pulses.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">
          Todavía no hay señales nuevas en este idioma. PULSE revisa el mundo cada pocos minutos —
          vuelve enseguida, o prueba con otro idioma arriba.
        </div>
      )}

      <div className="flex flex-col gap-3">
        {pulses?.map((pulse) => (
          <PulseCard key={pulse.id} pulse={pulse} isExploration={pulse.isExploration} />
        ))}
      </div>
    </div>
  );
}

function LanguageSwitcher({
  language,
  onChange,
}: {
  language: Language;
  onChange: (lang: Language) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium"
      >
        {current.flag} {current.code.toUpperCase()}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 flex flex-col gap-1 rounded-xl border border-border bg-surface-raised p-1.5 shadow-lg">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => {
                  onChange(l.code);
                  setOpen(false);
                }}
                className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-left text-xs font-medium ${
                  l.code === language ? "bg-accent text-white" : "text-foreground"
                }`}
              >
                {l.flag} {l.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ChangesBanner({ visit }: { visit: VisitInfo | null }) {
  if (!visit) {
    return <div className="h-16 animate-pulse rounded-2xl bg-surface" />;
  }

  if (visit.isFirstVisit) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-accent/20 to-transparent border border-accent/30 p-4">
        <p className="text-base font-semibold">Bienvenido a PULSE</p>
        <p className="text-sm text-muted">Esto es lo que está cambiando en el mundo ahora mismo.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-accent/20 to-transparent border border-accent/30 p-4">
      <p className="text-2xl font-bold text-foreground">
        {visit.changesSince} cambio{visit.changesSince !== 1 ? "s" : ""}
      </p>
      <p className="text-sm text-muted">relevante{visit.changesSince !== 1 ? "s" : ""} desde tu última visita</p>
    </div>
  );
}
