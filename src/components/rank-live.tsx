"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RankBadge } from "./rank-badge";
import { rankNudge, rankPercent, RANK_LABELS } from "@/lib/rank-core";
import { subscribeToRankChanges, type RankSnapshot } from "@/lib/rank-events";
import type { RankName } from "@/types";

type Overview = RankSnapshot & { storedRank?: RankName };

/**
 * The rank, live, on every logging page.
 *
 * It loads once from /api/rank, then listens for `kbe:rank-changed` — which the
 * log forms fire immediately after a save — so the bar and badge move in the
 * same breath as the "Saved" message instead of on the next page load.
 */
export function RankLive({ className = "" }: { className?: string }) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [flash, setFlash] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/rank", { cache: "no-store" });
      if (!res.ok) return;
      setOverview((await res.json()) as Overview);
    } catch {
      // The panel is a nicety — never let it break the page.
    }
  }, []);

  useEffect(() => {
    void load();
    const unsubscribe = subscribeToRankChanges((snapshot) => {
      if (snapshot) {
        setOverview(snapshot);
        setFlash(true);
        if (flashTimer.current) clearTimeout(flashTimer.current);
        flashTimer.current = setTimeout(() => setFlash(false), 2200);
      } else {
        void load();
      }
    });

    return () => {
      unsubscribe();
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, [load]);

  if (!overview) {
    return (
      <section className={`card ${className}`}>
        <p className="text-xs uppercase tracking-wider text-muted">Consistency rank</p>
        <p className="mt-2 text-sm text-muted">Loading your rank…</p>
      </section>
    );
  }

  const percent = rankPercent(overview);

  return (
    <section
      className={`card ${flash ? "border-gold/60 shadow-glow" : ""} transition ${
        className
      }`}
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted">Consistency rank</p>
          <div className="mt-1.5 flex items-center gap-2">
            <RankBadge rank={overview.rank} />
            <span className="text-sm text-muted">
              {overview.activeDays} of {overview.windowDays} active days
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wider text-muted">Streak</p>
          <p className="mt-1 text-lg font-semibold">
            {overview.streak} day{overview.streak === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-panel2">
        <div
          className="h-full rounded-full bg-gold-fade transition-all duration-500"
          style={{ width: `${Math.max(percent, 3)}%` }}
        />
      </div>

      <p className={`mt-3 text-xs ${flash ? "text-goldSoft" : "text-muted"}`}>
        {flash ? "Rank updated just now. " : ""}
        {rankNudge(overview)}
      </p>

      {overview.atTopRank && (
        <p className="mt-1 text-[11px] text-muted/80">
          {RANK_LABELS[overview.rank]} is the top rank — six active days out of seven.
        </p>
      )}
    </section>
  );
}
