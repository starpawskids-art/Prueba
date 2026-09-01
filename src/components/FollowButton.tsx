"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FollowButton({
  targetUserId,
  initialFollowing,
}: {
  targetUserId: string;
  initialFollowing: boolean;
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      const res = await fetch("/api/social/follow", {
        method: following ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId }),
      });
      if (res.ok) {
        setFollowing((f) => !f);
        // Follower/following counts on this page are rendered server-side —
        // refresh so they reflect the change instead of going stale.
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`rounded-xl px-5 py-2 text-sm font-semibold disabled:opacity-50 ${
        following ? "bg-surface-raised text-foreground" : "bg-accent text-white"
      }`}
    >
      {following ? "Siguiendo" : "Seguir"}
    </button>
  );
}
