import { NextResponse } from "next/server";
import { getOrCreateUserId } from "@/lib/user";
import { addComment, getCommentsForPulse } from "@/lib/social/comments";
import { notifyCommentReply } from "@/lib/push/social";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewerId = await getOrCreateUserId();
  return NextResponse.json({ comments: getCommentsForPulse(id, viewerId) });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getOrCreateUserId();
  const body = (await request.json()) as { body?: string; parentCommentId?: string };

  if (!body.body) {
    return NextResponse.json({ error: "El comentario está vacío." }, { status: 400 });
  }

  const result = addComment(userId, id, body.body, body.parentCommentId);
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  if (result.parentAuthorId) {
    notifyCommentReply(userId, result.parentAuthorId, id, result.comment.body).catch((err) =>
      console.error("[pulse] comment-reply notification failed", err)
    );
  }

  return NextResponse.json({ ok: true, comment: result.comment });
}
