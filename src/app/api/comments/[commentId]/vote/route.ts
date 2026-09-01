import { NextResponse } from "next/server";
import { getOrCreateUserId } from "@/lib/user";
import { toggleCommentVote } from "@/lib/social/comments";
import { notifyCommentAttention } from "@/lib/push/social";

export async function POST(request: Request, { params }: { params: Promise<{ commentId: string }> }) {
  const { commentId } = await params;
  const userId = await getOrCreateUserId();

  const result = toggleCommentVote(userId, commentId);
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  if (result.crossedThreshold) {
    notifyCommentAttention(result.authorId, result.pulseId, result.body, result.voteCount).catch((err) =>
      console.error("[pulse] comment-attention notification failed", err)
    );
  }

  return NextResponse.json({ ok: true, voted: result.voted, voteCount: result.voteCount });
}
