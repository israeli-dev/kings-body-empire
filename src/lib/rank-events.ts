import type { RankName } from "@/types";

/**
 * Tiny client-side bus so the header badge, the log pages and the rank panel
 * all show the *same* rank the moment something is logged.
 *
 * The API recalculates the rank inside the write transaction path; the page that
 * made the request then announces the fresh numbers here. No polling, no
 * refetch storm, no stale badge.
 */

export const RANK_CHANGED_EVENT = "kbe:rank-changed";

export type RankSnapshot = {
  rank: RankName;
  activeDays: number;
  streak: number;
  windowDays: number;
  nextRank: RankName | null;
  daysToNextRank: number;
  atTopRank: boolean;
};

export function announceRankChange(snapshot?: RankSnapshot): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<RankSnapshot | undefined>(RANK_CHANGED_EVENT, { detail: snapshot }),
  );
}

/** Returns an unsubscribe function, so effects can clean up. */
export function subscribeToRankChanges(
  handler: (snapshot?: RankSnapshot) => void,
): () => void {
  if (typeof window === "undefined") return () => undefined;
  const listener = (event: Event) => {
    handler((event as CustomEvent<RankSnapshot | undefined>).detail);
  };
  window.addEventListener(RANK_CHANGED_EVENT, listener);
  return () => window.removeEventListener(RANK_CHANGED_EVENT, listener);
}
