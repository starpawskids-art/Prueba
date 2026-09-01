"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import ReportButton from "./ReportButton";

type Comment = {
  id: string;
  body: string;
  createdAt: number;
  author: { userId: string; name: string; username: string | null };
  parentCommentId: string | null;
  replyToName: string | null;
  voteCount: number;
  viewerHasVoted: boolean;
};

type SortMode = "recent" | "top";

function timeAgo(ts: number): string {
  const minutes = Math.max(0, (Date.now() - ts) / 60000);
  if (minutes < 1) return "hace instantes";
  if (minutes < 60) return `hace ${Math.round(minutes)} min`;
  const hours = minutes / 60;
  if (hours < 24) return `hace ${Math.round(hours)} h`;
  return `hace ${Math.round(hours / 24)} d`;
}

// Groups each top-level comment with all of its descendants (any depth —
// the UI only shows one level of indent, but a reply-to-a-reply is still
// possible via the API), preserving chronological order within a group.
// Used only for "Más votados": sorting is by the group's root comment,
// never scattering a reply away from the thread it belongs to.
function groupIntoThreads(comments: Comment[]): Comment[][] {
  const byId = new Map(comments.map((c) => [c.id, c]));
  function rootIdOf(c: Comment): string {
    let cur = c;
    const seen = new Set<string>();
    while (cur.parentCommentId && !seen.has(cur.id)) {
      seen.add(cur.id);
      const parent = byId.get(cur.parentCommentId);
      if (!parent) break;
      cur = parent;
    }
    return cur.id;
  }

  const groups = new Map<string, Comment[]>();
  const order: string[] = [];
  for (const c of comments) {
    const rid = rootIdOf(c);
    if (!groups.has(rid)) {
      groups.set(rid, []);
      order.push(rid);
    }
    groups.get(rid)!.push(c);
  }
  return order.map((rid) => groups.get(rid)!);
}

export default function CommentsSection({ pulseId }: { pulseId: string }) {
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [replyTarget, setReplyTarget] = useState<{ id: string; name: string } | null>(null);
  const [sort, setSort] = useState<SortMode>("recent");
  const [voteErrors, setVoteErrors] = useState<Record<string, string>>({});
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

  async function vote(comment: Comment) {
    setVoteErrors((prev) => ({ ...prev, [comment.id]: "" }));
    // optimistic update
    setComments(
      (prev) =>
        prev?.map((c) =>
          c.id === comment.id
            ? { ...c, viewerHasVoted: !c.viewerHasVoted, voteCount: c.voteCount + (c.viewerHasVoted ? -1 : 1) }
            : c
        ) ?? prev
    );
    const res = await fetch(`/api/comments/${comment.id}/vote`, { method: "POST" });
    const data = (await res.json()) as { error?: string; voted?: boolean; voteCount?: number };
    if (!res.ok) {
      // revert optimistic update
      setComments(
        (prev) => prev?.map((c) => (c.id === comment.id ? { ...c, ...comment } : c)) ?? prev
      );
      setVoteErrors((prev) => ({ ...prev, [comment.id]: data.error ?? "No se pudo votar." }));
    }
  }

  const displayGroups = useMemo(() => {
    if (!comments) return [];
    if (sort === "recent") return comments.length ? [comments] : [];
    const groups = groupIntoThreads(comments);
    const rootVotes = (g: Comment[]) => g.find((c) => !c.parentCommentId)?.voteCount ?? 0;
    return groups.sort((a, b) => rootVotes(b) - rootVotes(a));
  }, [comments, sort]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted">
          Contexto de la comunidad {comments && comments.length > 0 ? `(${comments.length})` : ""}
        </h2>
        {comments && comments.length > 1 && (
          <div className="flex gap-1 text-[11px]">
            <button
              onClick={() => setSort("recent")}
              className={`rounded-full px-2 py-0.5 ${sort === "recent" ? "bg-accent text-white" : "text-muted"}`}
            >
              Recientes
            </button>
            <button
              onClick={() => setSort("top")}
              className={`rounded-full px-2 py-0.5 ${sort === "top" ? "bg-accent text-white" : "text-muted"}`}
            >
              Más votados
            </button>
          </div>
        )}
      </div>
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
        {displayGroups.flat().map((c) => (
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
              <div className="flex items-center gap-3">
                <button
                  onClick={() => startReply(c)}
                  className="text-[11px] text-muted underline underline-offset-2"
                >
                  Responder
                </button>
                <button
                  onClick={() => vote(c)}
                  className={`flex items-center gap-1 text-[11px] font-medium ${c.viewerHasVoted ? "text-accent" : "text-muted"}`}
                >
                  <span aria-hidden>{c.viewerHasVoted ? "★" : "☆"}</span>
                  {c.voteCount > 0 ? c.voteCount : "Valorar"}
                </button>
              </div>
              <ReportButton targetType="comment" targetId={c.id} />
            </div>
            {voteErrors[c.id] && (
              <p className="mt-1 text-[11px] text-[var(--confidence-baja)]">{voteErrors[c.id]}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
