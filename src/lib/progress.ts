import { prisma } from "./prisma";
import { DEFAULT_TIME_ZONE, computeStreak, dayKey } from "./rank-core";
import {
  buildActivityMatrix,
  buildCalorieSeries,
  buildVolumeSeries,
  buildWeightSeries,
  daysSinceLastLog,
  longestStreak,
  parseRange,
  windowStartKey,
  type ActivityCell,
  type CalorieSeries,
  type Range,
  type VolumeSeries,
  type WeightSeries,
} from "./progress-core";

export const DAY_MS = 24 * 60 * 60 * 1000;

export type ProgressStats = {
  latestWeightKg: number | null;
  weightChangeKg: number | null;
  bestStreak: number;
  currentStreak: number;
  daysSinceLastLog: number | null;
  activeDays: number;
  totalSessions: number;
  totalVolumeKg: number;
  averageCalories: number | null;
};

export type ProgressPayload = {
  range: Range;
  generatedAt: string;
  weight: WeightSeries;
  volume: VolumeSeries;
  calories: CalorieSeries;
  activity: ActivityCell[];
  stats: ProgressStats;
};

/**
 * Everything the Progress page and `GET /api/progress` need, in one round trip.
 * Charts are drawn from this payload, so the page and the API can never drift.
 */
export async function getProgress(
  userId: string,
  rangeInput: unknown = 30,
  now: Date = new Date(),
): Promise<ProgressPayload> {
  const range = parseRange(rangeInput);
  const timeZone = DEFAULT_TIME_ZONE;
  const startKey = windowStartKey(range, now, timeZone);
  const since = new Date(now.getTime() - (range - 1) * DAY_MS);

  const [measurements, workouts, foods] = await Promise.all([
    prisma.measurementLog.findMany({
      where: { userId, loggedAt: { gte: since } },
      select: { loggedAt: true, weightKg: true, waistCm: true },
      orderBy: { loggedAt: "asc" },
    }),
    prisma.workoutLog.findMany({
      where: { userId, loggedAt: { gte: since } },
      select: { loggedAt: true, sets: true, reps: true, weightKg: true },
      orderBy: { loggedAt: "asc" },
    }),
    prisma.foodLog.findMany({
      where: { userId, loggedAt: { gte: since } },
      select: { loggedAt: true, calories: true },
      orderBy: { loggedAt: "asc" },
    }),
  ]);

  const workoutDates = workouts.map((row) => row.loggedAt);
  const foodDates = foods.map((row) => row.loggedAt);
  const measurementDates = measurements.map((row) => row.loggedAt);
  const allDates = [...workoutDates, ...foodDates, ...measurementDates];

  const weight = buildWeightSeries(measurements, { days: range, now, timeZone });
  const volume = buildVolumeSeries(workouts, {
    weeks: Math.ceil(range / 7),
    now,
    timeZone,
  });
  const calories = buildCalorieSeries(foods, { days: range, now, timeZone });
  const activity = buildActivityMatrix(
    { workouts: workoutDates, foods: foodDates, measurements: measurementDates },
    { days: range, now, timeZone },
  );

  const activeDays = activity.filter((cell) => cell.count > 0).length;
  const days = new Set(allDates.map((date) => dayKey(date, timeZone)).filter((key) => key >= startKey));

  return {
    range,
    generatedAt: now.toISOString(),
    weight,
    volume,
    calories,
    activity,
    stats: {
      latestWeightKg: weight.latestKg,
      weightChangeKg: weight.changeKg,
      bestStreak: longestStreak(allDates, timeZone),
      currentStreak: computeStreak(allDates, now, timeZone),
      daysSinceLastLog: daysSinceLastLog(allDates, now, timeZone),
      activeDays: days.size,
      totalSessions: volume.totalSessions,
      totalVolumeKg: volume.totalVolumeKg,
      averageCalories: calories.average,
    },
  };
}
