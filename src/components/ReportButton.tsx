"use client";

import { useState } from "react";

export default function ReportButton({
  targetType,
  targetId,
}: {
  targetType: "pulse" | "comment";
  targetId: string;
}) {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");

  if (state === "sent") {
    return <span className="text-[11px] text-muted">Reportado</span>;
  }

  return (
    <button
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setState("sending");
        try {
          await fetch("/api/reports", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ targetType, targetId }),
          });
        } finally {
          setState("sent");
        }
      }}
      disabled={state === "sending"}
      className="text-[11px] text-muted underline underline-offset-2 disabled:opacity-50"
    >
      Reportar
    </button>
  );
}
