"use client";

import { useEffect, useState } from "react";
import {
  PushSupport,
  getExistingSubscription,
  getPushSupport,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push/client";

type Status = "loading" | "off" | "on";

export default function PushOptIn() {
  const [support, setSupport] = useState<PushSupport>("unsupported");
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      setSupport(getPushSupport());
      try {
        const sub = await getExistingSubscription();
        setStatus(sub ? "on" : "off");
      } catch {
        setStatus("off");
      }
    })();
  }, []);

  async function enable() {
    setBusy(true);
    setError(null);
    try {
      const subscription = await subscribeToPush();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });
      if (!res.ok) throw new Error("El servidor rechazó la suscripción.");
      setStatus("on");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo activar.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError(null);
    try {
      const endpoint = await unsubscribeFromPush();
      if (endpoint) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
      }
      setStatus("off");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo desactivar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-muted">Notificaciones</h2>
      {support === "unsupported" && (
        <p className="mt-2 text-xs text-muted">Tu navegador no admite notificaciones push.</p>
      )}
      {support === "denied" && (
        <p className="mt-2 text-xs text-muted">
          Bloqueaste las notificaciones para este sitio. Actívalas desde los ajustes del
          navegador si quieres recibirlas.
        </p>
      )}
      {support === "ready" && (
        <>
          <p className="mt-1 text-xs text-muted">
            Como mucho 1–3 avisos al día: cuando algo que sigues cambia, o una tendencia
            excepcional en tus temas. Nunca spam.
          </p>
          <button
            onClick={status === "on" ? disable : enable}
            disabled={busy || status === "loading"}
            className={`mt-2 rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-40 ${
              status === "on" ? "bg-accent text-white" : "bg-surface-raised text-foreground"
            }`}
          >
            {status === "loading"
              ? "Comprobando…"
              : status === "on"
                ? "Notificaciones activadas"
                : "Activar notificaciones"}
          </button>
          {error && <p className="mt-2 text-xs text-[var(--confidence-baja)]">{error}</p>}
        </>
      )}
    </div>
  );
}
