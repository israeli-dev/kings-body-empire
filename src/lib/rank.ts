import { prisma } from "./prisma";
import {
  computeStreak,
  countActiveDays,
  rankForActiveDays,
  rankProgress,
  type RankProgress,
} from "./rank-core";
import type { RankName } from "@/types";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Recomputes a client's rank from the last 7 days of logging activity.
 * Cheap enough to call after every log write.
 */
export async function recalculateRank(userId: string): Promise<{
  rank: RankName;
  activeDays: number;
  streak: number;
}> {
  const now = new Date();
  // 90 days of history so long streaks are counted in full.
  const since = new Date(now.getTime() - 90 * DAY_MS);

  const [workouts, foods, measurements] = await Promise.all([
    prisma.workoutLog.findMany({
      where: { userId, loggedAt: { gte: since } },
      select: { loggedAt: true },
    }),
    prisma.foodLog.findMany({
      where: { userId, loggedAt: { gte: since } },
      select: { loggedAt: true },
    }),
    prisma.measurementLog.findMany({
      where: { userId, loggedAt: { gte: since } },
      select: { loggedAt: true },
    }),
  ]);

  const dates = [...workouts, ...foods, ...measurements].map((log) => log.loggedAt);
  const activeDays = countActiveDays(dates, now);
  const rank = rankForActiveDays(activeDays);
  const streak = computeStreak(dates, now);

  await prisma.user.update({ where: { id: userId }, data: { rank } });

  return { rank, activeDays, streak };
}

/** Rank + progress for the dashboard, computed from the stored rank. */
export async function getRankOverview(userId: string): Promise<
  RankProgress & { streak: number; storedRank: RankName }
> {
  const now = new Date();
  // 90 days of history so long streaks are counted in full.
  const since = new Date(now.getTime() - 90 * DAY_MS);

  const [user, workouts, foods, measurements] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { rank: true } }),
    prisma.workoutLog.findMany({
      where: { userId, loggedAt: { gte: since } },
      select: { loggedAt: true },
    }),
    prisma.foodLog.findMany({
      where: { userId, loggedAt: { gte: since } },
      select: { loggedAt: true },
    }),
    prisma.measurementLog.findMany({
      where: { userId, loggedAt: { gte: since } },
      select: { loggedAt: true },
    }),
  ]);

  const dates = [...workouts, ...foods, ...measurements].map((log) => log.loggedAt);
  const activeDays = countActiveDays(dates, now);
  const progress = rankProgress(activeDays);
  const streak = computeStreak(dates, now);
  const storedRank = (user?.rank as RankName) ?? progress.rank;

  return { ...progress, storedRank, streak };
}
