"use client";

import { useState } from "react";
import BottomNav from "@/components/BottomNav";
import CollectionView from "@/components/CollectionView";
import PeopleActivityFeed from "@/components/PeopleActivityFeed";

export default function FollowingPage() {
  const [tab, setTab] = useState<"pulses" | "people">("pulses");

  return (
    <>
      <div className="flex flex-1 flex-col gap-4 px-4 pb-6 pt-5">
        <header>
          <h1 className="text-xl font-bold">Sigues</h1>
          <p className="text-sm text-muted">Acontecimientos y personas que quieres seguir de cerca.</p>
        </header>

        <div className="flex gap-2">
          <button
            onClick={() => setTab("pulses")}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
              tab === "pulses" ? "border-accent bg-accent text-white" : "border-border bg-surface"
            }`}
          >
            Pulses
          </button>
          <button
            onClick={() => setTab("people")}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
              tab === "people" ? "border-accent bg-accent text-white" : "border-border bg-surface"
            }`}
          >
            Personas
          </button>
        </div>

        {tab === "pulses" ? (
          <CollectionView
            title=""
            subtitle=""
            field="following"
            emptyText="No sigues ninguna Pulse todavía. Toca «Seguir» en cualquier tarjeta."
            bare
          />
        ) : (
          <PeopleActivityFeed />
        )}
      </div>
      <BottomNav />
    </>
  );
}
