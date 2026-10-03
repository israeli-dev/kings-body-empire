import { prisma } from "./prisma";

export async function recalculateRank(userId: string) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [workouts, foods, measurements] = await Promise.all([
    prisma.workoutLog.findMany({ where: { userId, loggedAt: { gte: sevenDaysAgo } }, select: { loggedAt: true } }),
    prisma.foodLog.findMany({ where: { userId, loggedAt: { gte: sevenDaysAgo } }, select: { loggedAt: true } }),
    prisma.measurementLog.findMany({ where: { userId, loggedAt: { gte: sevenDaysAgo } }, select: { loggedAt: true } }),
  ]);

  const allDates = [...workouts, ...foods, ...measurements].map((log) =>
    log.loggedAt.toISOString().slice(0, 10) // YYYY-MM-DD, collapses same-day logs
  );
  const distinctDays = new Set(allDates).size;

  let rank: "BRONZE" | "SILVER" | "GOLD" | "DIAMOND";
  if (distinctDays >= 6) rank = "DIAMOND";
  else if (distinctDays >= 4) rank = "GOLD";
  else if (distinctDays >= 2) rank = "SILVER";
  else rank = "BRONZE";

  await prisma.user.update({ where: { id: userId }, data: { rank } });
  return { rank, distinctDays };
}
