import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrCreateUserId, getUserByUsername, publicName } from "@/lib/user";
import { getCommentsByUser } from "@/lib/social/comments";
import { getFollowerCount, getFollowingCount, isFollowingUser } from "@/lib/social/follows";
import FollowButton from "@/components/FollowButton";
import db from "@/lib/db";

export default async function PublicProfilePage({ params }: PageProps<"/u/[username]">) {
  const { username } = await params;
  const user = getUserByUsername(username);
  if (!user) notFound();

  const viewerId = await getOrCreateUserId();
  const isOwnProfile = viewerId === user.id;
  const followerCount = getFollowerCount(user.id);
  const followingCount = getFollowingCount(user.id);

  const topTopics = db
    .prepare(
      `SELECT topic, COUNT(*) as n FROM interactions WHERE user_id = ? AND type IN ('save','follow','more')
       GROUP BY topic ORDER BY n DESC LIMIT 5`
    )
    .all(user.id) as Array<{ topic: string; n: number }>;

  const comments = getCommentsByUser(user.id, 10);

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 pb-8 pt-5">
      <Link href="/" className="text-sm text-muted">
        ← Volver
      </Link>

      <header className="flex flex-col items-center gap-2 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-2xl font-bold text-accent">
          {publicName(user).replace("@", "").slice(0, 1).toUpperCase()}
        </div>
        <h1 className="text-xl font-bold">{publicName(user)}</h1>
        {user.displayName && <p className="text-sm text-muted">@{user.username}</p>}
        {user.bio && <p className="max-w-xs text-sm text-foreground">{user.bio}</p>}
        <p className="text-xs text-muted">
          En PULSE desde {new Date(user.createdAt).toLocaleDateString("es-ES")}
        </p>
        <div className="flex items-center gap-4 text-sm">
          <span>
            <strong>{followerCount}</strong> <span className="text-muted">seguidores</span>
          </span>
          <span>
            <strong>{followingCount}</strong> <span className="text-muted">siguiendo</span>
          </span>
        </div>
        {!isOwnProfile && (
          <FollowButton targetUserId={user.id} initialFollowing={isFollowingUser(viewerId, user.id)} />
        )}
      </header>

      {topTopics.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted">Temas de interés</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {topTopics.map((t) => (
              <span
                key={t.topic}
                className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent"
              >
                {t.topic}
              </span>
            ))}
          </div>
        </div>
      )}

      {comments.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted">Aportes recientes</h2>
          <div className="mt-2 flex flex-col gap-2">
            {comments.map((c) => (
              <Link
                key={c.id}
                href={`/pulse/${c.pulseId}`}
                className="block rounded-xl border border-border bg-surface p-3 text-sm"
              >
                <p className="text-xs text-muted line-clamp-1">{c.pulseTitle}</p>
                <p className="mt-1 text-foreground">{c.body}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
