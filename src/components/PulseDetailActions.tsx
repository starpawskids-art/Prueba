"use client";

import { useState } from "react";

async function sendInteraction(pulseId: string, type: string) {
  try {
    await fetch("/api/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pulseId, type }),
    });
  } catch {
    // best-effort
  }
}

export default function PulseDetailActions({
  pulseId,
  sourceUrl,
  title,
}: {
  pulseId: string;
  sourceUrl?: string;
  title: string;
}) {
  const [saved, setSaved] = useState(false);
  const [following, setFollowing] = useState(false);

  return (
    <div className="flex items-center gap-2 text-sm">
      <button
        onClick={() => {
          setSaved((s) => !s);
          sendInteraction(pulseId, "save");
        }}
        className={`flex-1 rounded-xl py-3 font-medium ${
          saved ? "bg-accent text-white" : "bg-surface-raised text-foreground"
        }`}
      >
        {saved ? "Guardado" : "Guardar"}
      </button>
      <button
        onClick={() => {
          setFollowing((f) => !f);
          sendInteraction(pulseId, "follow");
        }}
        className={`flex-1 rounded-xl py-3 font-medium ${
          following ? "bg-accent text-white" : "bg-surface-raised text-foreground"
        }`}
      >
        {following ? "Siguiendo" : "Seguir"}
      </button>
      <button
        onClick={async () => {
          if (navigator.share) {
            try {
              await navigator.share({ title, url: sourceUrl ?? "" });
            } catch {
              // cancelled
            }
          }
          sendInteraction(pulseId, "open");
        }}
        className="flex-1 rounded-xl bg-surface-raised py-3 font-medium text-foreground"
      >
        Compartir
      </button>
    </div>
  );
}
