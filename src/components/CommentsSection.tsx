"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ReportButton from "./ReportButton";

type Comment = {
  id: string;
  body: string;
  createdAt: number;
  author: { userId: string; name: string; username: string | null };
  parentCommentId: string | null;
  replyToName: string | null;
};

function timeAgo(ts: number): string {
  const minutes = Math.max(0, (Date.now() - ts) / 60000);
  if (minutes < 1) return "hace instantes";
  if (minutes < 60) return `hace ${Math.round(minutes)} min`;
  const hours = minutes / 60;
  if (hours < 24) return `hace ${Math.round(hours)} h`;
  return `hace ${Math.round(hours / 24)} d`;
}

export default function CommentsSection({ pulseId }: { pulseId: string }) {
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [replyTarget, setReplyTarget] = useState<{ id: string; name: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function load() {
    const res = await fetch(`/api/pulses/${pulseId}/comments`);
    const data = (await res.json()) as { comments: Comment[] };
    setComments(data.comments);
  }

  useEffect(() => {
    (async () => {
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pulseId]);

  function startReply(comment: Comment) {
    setReplyTarget({ id: comment.id, name: comment.author.name });
    textareaRef.current?.focus();
  }

  async function submit() {
    if (!draft.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/pulses/${pulseId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draft, parentCommentId: replyTarget?.id }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "No se pudo publicar.");
        return;
      }
      setDraft("");
      setReplyTarget(null);
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-muted">
        Contexto de la comunidad {comments && comments.length > 0 ? `(${comments.length})` : ""}
      </h2>
      <p className="mt-1 text-xs text-muted">
        Aporta lo que sepas — enlaces, matices, lo que las fuentes no cuentan.
      </p>

      {replyTarget && (
        <div className="mt-2 flex items-center justify-between rounded-lg bg-accent-soft px-3 py-1.5 text-xs text-accent">
          <span>Respondiendo a {replyTarget.name}</span>
          <button onClick={() => setReplyTarget(null)} aria-label="Cancelar respuesta">
            ✕
          </button>
        </div>
      )}

      <div className="mt-2 flex gap-2">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
          }}
          placeholder={replyTarget ? `Responde a ${replyTarget.name}…` : "Añade contexto…"}
          maxLength={500}
          rows={2}
          className="flex-1 resize-none rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </div>
      <div className="mt-1 flex items-center justify-between">
        {error && <p className="text-xs text-[var(--confidence-baja)]">{error}</p>}
        <button
          onClick={submit}
          disabled={!draft.trim() || submitting}
          className="ml-auto rounded-xl bg-accent px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
        >
          {submitting ? "Publicando…" : "Publicar"}
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {comments === null && <p className="text-xs text-muted">Cargando comentarios…</p>}
        {comments?.length === 0 && (
          <p className="text-xs text-muted">Todavía nadie ha aportado contexto. Sé el primero.</p>
        )}
        {comments?.map((c) => (
          <div
            key={c.id}
            className={`rounded-xl border border-border bg-surface p-3 text-sm ${c.parentCommentId ? "ml-4 border-l-2 border-l-accent/40" : ""}`}
          >
            <div className="flex items-center justify-between text-xs text-muted">
              {c.author.username ? (
                <Link href={`/u/${c.author.username}`} className="font-medium text-foreground">
                  {c.author.name}
                </Link>
              ) : (
                <span className="font-medium text-foreground">{c.author.name}</span>
              )}
              <span>{timeAgo(c.createdAt)}</span>
            </div>
            {c.replyToName && (
              <p className="mt-0.5 text-[11px] text-accent">↳ en respuesta a {c.replyToName}</p>
            )}
            <p className="mt-1 text-foreground">{c.body}</p>
            <div className="mt-1 flex items-center justify-between">
              <button
                onClick={() => startReply(c)}
                className="text-[11px] text-muted underline underline-offset-2"
              >
                Responder
              </button>
              <ReportButton targetType="comment" targetId={c.id} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
