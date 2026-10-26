import type { RankName } from "@/types";

/** Days are counted in this timezone so a 9pm session still lands on "today". */
export const DEFAULT_TIME_ZONE =
  process.env.NEXT_PUBLIC_TIMEZONE?.trim() || "Africa/Lagos";

/** Number of active days (out of 7) needed for each rank. */
export const RANK_TARGET_DAYS = 6;

const RANK_ORDER: RankName[] = ["BRONZE", "SILVER", "GOLD", "DIAMOND"];

const formatterCache = new Map<string, Intl.DateTimeFormat>();

/** "YYYY-MM-DD" for the given instant, in the given timezone. */
export function dayKey(date: Date, timeZone: string = DEFAULT_TIME_ZONE): string {
  let formatter = formatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    formatterCache.set(timeZone, formatter);
  }
  // en-CA formats as YYYY-MM-DD
  return formatter.format(date);
}

/** The key for the calendar day before `key` (timezone independent). */
export function previousDayKey(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export function rankForActiveDays(activeDays: number): RankName {
  if (activeDays >= 6) return "DIAMOND";
  if (activeDays >= 4) return "GOLD";
  if (activeDays >= 2) return "SILVER";
  return "BRONZE";
}

/** Distinct calendar days touched, ignoring anything before `since`. */
export function countActiveDays(
  dates: Date[],
  now: Date,
  windowDays = 7,
  timeZone: string = DEFAULT_TIME_ZONE,
): number {
  const start = new Date(now.getTime() - (windowDays - 1) * 24 * 60 * 60 * 1000);
  const startKey = dayKey(start, timeZone);
  const endKey = dayKey(now, timeZone);
  const keys = new Set<string>();
  for (const date of dates) {
    const key = dayKey(date, timeZone);
    if (key >= startKey && key <= endKey) keys.add(key);
  }
  return keys.size;
}

/**
 * Consecutive days with activity, counting back from today. A streak stays
 * alive if the user logged yesterday but has not logged yet today.
 */
export function computeStreak(
  dates: Date[],
  now: Date,
  timeZone: string = DEFAULT_TIME_ZONE,
): number {
  const keys = new Set(dates.map((date) => dayKey(date, timeZone)));
  const today = dayKey(now, timeZone);
  let cursor = keys.has(today) ? today : previousDayKey(today);
  let streak = 0;
  // Guard against a runaway loop if the set is malformed.
  for (let i = 0; i < 400; i += 1) {
    if (!keys.has(cursor)) break;
    streak += 1;
    cursor = previousDayKey(cursor);
  }
  return streak;
}

export type RankProgress = {
  rank: RankName;
  activeDays: number;
  windowDays: number;
  nextRank: RankName | null;
  daysToNextRank: number;
  atTopRank: boolean;
};

export function rankProgress(activeDays: number, windowDays = 7): RankProgress {
  const rank = rankForActiveDays(activeDays);
  const thresholds: Record<RankName, number> = {
    BRONZE: 0,
    SILVER: 2,
    GOLD: 4,
    DIAMOND: 6,
  };
  const nextRank = RANK_ORDER[RANK_ORDER.indexOf(rank) + 1] ?? null;
  return {
    rank,
    activeDays,
    windowDays,
    nextRank,
    daysToNextRank: nextRank ? Math.max(0, thresholds[nextRank] - activeDays) : 0,
    atTopRank: nextRank === null,
  };
}

export const RANK_LABELS: Record<RankName, string> = {
  BRONZE: "Bronze",
  SILVER: "Silver",
  GOLD: "Gold",
  DIAMOND: "Diamond",
};

export const RANK_COLORS: Record<RankName, string> = {
  BRONZE: "#B07C4F",
  SILVER: "#C9CDD3",
  GOLD: "#F5B301",
  DIAMOND: "#9BE7F0",
};
