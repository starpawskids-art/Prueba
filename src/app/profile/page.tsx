import BottomNav from "@/components/BottomNav";
import ProfileInterests from "@/components/ProfileInterests";
import PushOptIn from "@/components/PushOptIn";
import PublicIdentity from "@/components/PublicIdentity";
import AccountAuth from "@/components/AccountAuth";
import { effectiveLanguage, getOrCreateUserId, getUser } from "@/lib/user";
import { getFollowerCount, getFollowingCount } from "@/lib/social/follows";
import db from "@/lib/db";

export default async function ProfilePage() {
  const userId = await getOrCreateUserId();
  const user = getUser(userId);

  const counts = db
    .prepare(
      `SELECT type, COUNT(*) as n FROM interactions WHERE user_id = ? GROUP BY type`
    )
    .all(userId) as Array<{ type: string; n: number }>;
  const countFor = (type: string) => counts.find((c) => c.type === type)?.n ?? 0;

  const topTopics = db
    .prepare(
      `SELECT topic, COUNT(*) as n FROM interactions WHERE user_id = ? AND type IN ('save','follow','more')
       GROUP BY topic ORDER BY n DESC LIMIT 3`
    )
    .all(userId) as Array<{ topic: string; n: number }>;

  return (
    <>
      <div className="flex flex-1 flex-col gap-6 px-4 pb-6 pt-5">
        <header>
          <h1 className="text-xl font-bold">Perfil</h1>
          <p className="text-sm text-muted">
            Miembro desde {user ? new Date(user.createdAt).toLocaleDateString("es-ES") : "—"}
          </p>
        </header>

        <AccountAuth />

        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Guardadas" value={countFor("save")} />
          <Stat label="Siguiendo" value={countFor("follow")} />
          <Stat label="Descartadas" value={countFor("dismiss")} />
        </div>

        {topTopics.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-muted">Tu perfil de curiosidad</h2>
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

        <PublicIdentity
          initialUsername={user?.username ?? null}
          initialDisplayName={user?.displayName ?? null}
          initialBio={user?.bio ?? null}
          followerCount={getFollowerCount(userId)}
          followingCount={getFollowingCount(userId)}
        />

        <ProfileInterests
          initialInterests={user?.interests ?? []}
          initialCustomInterests={user?.customInterests ?? []}
          initialLanguage={effectiveLanguage(user)}
        />

        <PushOptIn />

        <a
          href="/admin"
          className="mt-auto text-center text-xs text-muted underline underline-offset-2"
        >
          Panel de pipeline (debug)
        </a>
      </div>
      <BottomNav />
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface py-3">
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[11px] text-muted">{label}</p>
    </div>
  );
}
