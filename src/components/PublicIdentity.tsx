"use client";

import { useState } from "react";
import Link from "next/link";

export default function PublicIdentity({
  initialUsername,
  initialDisplayName,
  initialBio,
  followerCount,
  followingCount,
}: {
  initialUsername: string | null;
  initialDisplayName: string | null;
  initialBio: string | null;
  followerCount: number;
  followingCount: number;
}) {
  const [username, setUsernameState] = useState(initialUsername);
  const [usernameDraft, setUsernameDraft] = useState("");
  const [displayName, setDisplayName] = useState(initialDisplayName ?? "");
  const [bio, setBio] = useState(initialBio ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function claimUsername() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/account/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: usernameDraft }),
      });
      const data = (await res.json()) as { username?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "No se pudo reclamar ese usuario.");
        return;
      }
      setUsernameState(data.username ?? usernameDraft.toLowerCase());
      setUsernameDraft("");
    } finally {
      setSaving(false);
    }
  }

  async function saveProfile() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/account/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, bio }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "No se pudo guardar.");
        return;
      }
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  if (!username) {
    return (
      <div>
        <h2 className="text-sm font-semibold text-muted">Identidad pública</h2>
        <p className="mt-1 text-xs text-muted">
          Reclama un nombre de usuario para tener un perfil público en{" "}
          <span className="font-mono">/u/tu-nombre</span> — comentarios y a quién sigues serán
          visibles ahí. Es opcional; sin él sigues siendo anónimo.
        </p>
        <div className="mt-2 flex gap-2">
          <input
            value={usernameDraft}
            onChange={(e) => {
              setUsernameDraft(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""));
              setError(null);
            }}
            placeholder="tu_nombre"
            maxLength={20}
            className="flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            onClick={claimUsername}
            disabled={!usernameDraft || saving}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            Reclamar
          </button>
        </div>
        {error && <p className="mt-1 text-xs text-[var(--confidence-baja)]">{error}</p>}
        <p className="mt-1 text-[11px] text-muted">
          Ojo: no hay contraseña — el nombre está ligado a este navegador. Si borras las cookies
          o cambias de dispositivo, no podrás recuperarlo.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted">Identidad pública</h2>
        <Link href={`/u/${username}`} className="text-xs text-accent underline underline-offset-2">
          Ver perfil público
        </Link>
      </div>
      <p className="mt-1 text-xs text-muted">
        @{username} · {followerCount} seguidores · {followingCount} siguiendo
      </p>
      <div className="mt-2 flex flex-col gap-2">
        <input
          value={displayName}
          onChange={(e) => {
            setDisplayName(e.target.value);
            setSaved(false);
          }}
          placeholder="Nombre visible (opcional)"
          maxLength={40}
          className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <textarea
          value={bio}
          onChange={(e) => {
            setBio(e.target.value);
            setSaved(false);
          }}
          placeholder="Bio (opcional, máx. 160 caracteres)"
          maxLength={160}
          rows={2}
          className="resize-none rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <div className="flex items-center justify-between">
          <button
            onClick={saveProfile}
            disabled={saving}
            className="rounded-xl bg-surface-raised px-4 py-2 text-sm font-medium text-foreground disabled:opacity-40"
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
          {saved && <span className="text-xs text-accent">Guardado</span>}
        </div>
        {error && <p className="text-xs text-[var(--confidence-baja)]">{error}</p>}
      </div>
    </div>
  );
}
