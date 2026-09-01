"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "register" | "login";

export default function AccountAuth() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "anon" | "authed">("loading");
  const [email, setEmail] = useState<string | null>(null);

  const [mode, setMode] = useState<Mode>("register");
  const [emailDraft, setEmailDraft] = useState("");
  const [passwordDraft, setPasswordDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/auth/me");
      const data = (await res.json()) as { authenticated: boolean; email: string | null };
      setStatus(data.authenticated ? "authed" : "anon");
      setEmail(data.email);
    })();
  }, []);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailDraft, password: passwordDraft }),
      });
      const data = (await res.json()) as { ok?: boolean; email?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Algo falló.");
        return;
      }
      setStatus("authed");
      setEmail(data.email ?? emailDraft);
      setPasswordDraft("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setStatus("anon");
      setEmail(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading") {
    return <div className="h-20 animate-pulse rounded-2xl bg-surface" />;
  }

  if (status === "authed") {
    return (
      <div>
        <h2 className="text-sm font-semibold text-muted">Cuenta</h2>
        <p className="mt-1 text-sm text-foreground">Sesión iniciada como {email}</p>
        <p className="mt-1 text-xs text-muted">
          Tu identidad ya no depende de este navegador — inicia sesión con este email en
          cualquier dispositivo para recuperarla.
        </p>
        <button
          onClick={logout}
          disabled={busy}
          className="mt-2 rounded-xl bg-surface-raised px-4 py-2 text-sm font-medium text-foreground disabled:opacity-50"
        >
          Cerrar sesión
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-muted">Cuenta</h2>
      <p className="mt-1 text-xs text-muted">
        Ahora mismo tu identidad vive solo en este navegador. Crea una cuenta para no perderla si
        borras las cookies, o inicia sesión si ya tienes una en otro dispositivo.
      </p>

      <div className="mt-2 flex gap-2">
        <button
          onClick={() => {
            setMode("register");
            setError(null);
          }}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
            mode === "register" ? "border-accent bg-accent text-white" : "border-border bg-surface"
          }`}
        >
          Crear cuenta
        </button>
        <button
          onClick={() => {
            setMode("login");
            setError(null);
          }}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
            mode === "login" ? "border-accent bg-accent text-white" : "border-border bg-surface"
          }`}
        >
          Iniciar sesión
        </button>
      </div>

      <div className="mt-2 flex flex-col gap-2">
        <input
          type="email"
          value={emailDraft}
          onChange={(e) => {
            setEmailDraft(e.target.value);
            setError(null);
          }}
          placeholder="tu@email.com"
          className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <input
          type="password"
          value={passwordDraft}
          onChange={(e) => {
            setPasswordDraft(e.target.value);
            setError(null);
          }}
          placeholder={mode === "register" ? "Contraseña (mínimo 8 caracteres)" : "Contraseña"}
          className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
        />
        {error && <p className="text-xs text-[var(--confidence-baja)]">{error}</p>}
        <button
          onClick={submit}
          disabled={!emailDraft || !passwordDraft || busy}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {busy ? "Un momento…" : mode === "register" ? "Crear cuenta" : "Iniciar sesión"}
        </button>
      </div>
    </div>
  );
}
