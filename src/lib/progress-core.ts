/**
 * Progress maths, kept free of Prisma so it can be unit tested.
 * Everything is grouped by calendar day in the site timezone (Africa/Lagos by
 * default) so a 10pm session still counts as today.
 */
import { DEFAULT_TIME_ZONE, dayKey, previousDayKey } from "./rank-core";

export const DAY_MS = 24 * 60 * 60 * 1000;

export type Range = 30 | 90;
export const RANGES: Range[] = [30, 90];

export function parseRange(value: unknown): Range {
  return String(value) === "90" ? 90 : 30;
}

export type WeightLog = { loggedAt: Date; weightKg: number | null };
export type WorkoutLogLike = {
  loggedAt: Date;
  sets: number;
  reps: number;
  weightKg: number | null;
};
export type FoodLogLike = { loggedAt: Date; calories: number | null };

export type WeightPoint = { date: string; weightKg: number };
export type WeightSeries = {
  points: WeightPoint[];
  latestKg: number | null;
  firstKg: number | null;
  changeKg: number | null;
};

export type VolumeWeek = { weekStart: string; volumeKg: number; sessions: number };
export type VolumeSeries = {
  weeks: VolumeWeek[];
  totalVolumeKg: number;
  totalSessions: number;
};

export type CalorieDay = { date: string; calories: number };
export type CalorieSeries = {
  days: CalorieDay[];
  average: number | null;
  loggedDays: number;
};

export type ActivityCell = { date: string; count: number; level: 0 | 1 | 2 | 3 };

function round(value: number, places = 1): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

/** The first day key in a window ending today (inclusive). */
export function windowStartKey(days: number, now: Date, timeZone = DEFAULT_TIME_ZONE): string {
  return dayKey(new Date(now.getTime() - (days - 1) * DAY_MS), timeZone);
}

/** Monday of the week a day key belongs to. */
export function weekStartKey(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const offset = (date.getUTCDay() + 6) % 7; // Monday = 0
  date.setUTCDate(date.getUTCDate() - offset);
  return date.toISOString().slice(0, 10);
}

/** Days between two day keys, positive when `later` is after `earlier`. */
export function daysBetweenKeys(earlier: string, later: string): number {
  const toMs = (key: string) => {
    const [year, month, day] = key.split("-").map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((toMs(later) - toMs(earlier)) / DAY_MS);
}

/** Weight trend: one point per day (the last reading wins), oldest first. */
export function buildWeightSeries(
  logs: WeightLog[],
  options: { days: number; now: Date; timeZone?: string },
): WeightSeries {
  const timeZone = options.timeZone ?? DEFAULT_TIME_ZONE;
  const startKey = windowStartKey(options.days, options.now, timeZone);

  const byDay = new Map<string, { at: number; weightKg: number }>();
  for (const log of logs) {
    if (log.weightKg === null || !Number.isFinite(log.weightKg) || log.weightKg <= 0) continue;
    const key = dayKey(log.loggedAt, timeZone);
    if (key < startKey) continue;
    const existing = byDay.get(key);
    if (!existing || log.loggedAt.getTime() >= existing.at) {
      byDay.set(key, { at: log.loggedAt.getTime(), weightKg: log.weightKg });
    }
  }

  const points = [...byDay.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, value]) => ({ date, weightKg: round(value.weightKg) }));

  const latestKg = points.length ? points[points.length - 1].weightKg : null;
  const firstKg = points.length ? points[0].weightKg : null;
  const changeKg =
    points.length >= 2 && latestKg !== null && firstKg !== null
      ? round(latestKg - firstKg)
      : null;

  return { points, latestKg, firstKg, changeKg };
}

/**
 * Training volume per week: sets × reps × load. Bodyweight sets contribute
 * `sets × reps` so a week of press-ups is not invisible.
 */
export function buildVolumeSeries(
  workouts: WorkoutLogLike[],
  options: { weeks: number; now: Date; timeZone?: string },
): VolumeSeries {
  const timeZone = options.timeZone ?? DEFAULT_TIME_ZONE;
  const thisWeek = weekStartKey(dayKey(options.now, timeZone));

  const buckets = new Map<string, VolumeWeek>();
  for (let index = options.weeks - 1; index >= 0; index -= 1) {
    const [year, month, day] = thisWeek.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    date.setUTCDate(date.getUTCDate() - index * 7);
    const key = date.toISOString().slice(0, 10);
    buckets.set(key, { weekStart: key, volumeKg: 0, sessions: 0 });
  }

  for (const workout of workouts) {
    const key = weekStartKey(dayKey(workout.loggedAt, timeZone));
    const bucket = buckets.get(key);
    if (!bucket) continue;
    const sets = Math.max(0, workout.sets);
    const reps = Math.max(0, workout.reps);
    const load = workout.weightKg && workout.weightKg > 0 ? workout.weightKg : 1;
    bucket.volumeKg += sets * reps * load;
    bucket.sessions += 1;
  }

  const weeks = [...buckets.values()]
    .sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1))
    .map((week) => ({ ...week, volumeKg: Math.round(week.volumeKg) }));

  return {
    weeks,
    totalVolumeKg: weeks.reduce((sum, week) => sum + week.volumeKg, 0),
    totalSessions: weeks.reduce((sum, week) => sum + week.sessions, 0),
  };
}

/** Calories per day. Days without a meal log are zero, not missing. */
export function buildCalorieSeries(
  foods: FoodLogLike[],
  options: { days: number; now: Date; timeZone?: string },
): CalorieSeries {
  const timeZone = options.timeZone ?? DEFAULT_TIME_ZONE;
  const startKey = windowStartKey(options.days, options.now, timeZone);

  const totals = new Map<string, number>();
  for (let index = 0; index < options.days; index += 1) {
    const date = new Date(options.now.getTime() - (options.days - 1 - index) * DAY_MS);
    totals.set(dayKey(date, timeZone), 0);
  }

  for (const food of foods) {
    const key = dayKey(food.loggedAt, timeZone);
    if (key < startKey || !totals.has(key)) continue;
    if (!food.calories || food.calories <= 0) continue;
    totals.set(key, (totals.get(key) ?? 0) + food.calories);
  }

  const days = [...totals.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, calories]) => ({ date, calories: Math.round(calories) }));

  const logged = days.filter((day) => day.calories > 0);
  const average = logged.length
    ? Math.round(logged.reduce((sum, day) => sum + day.calories, 0) / logged.length)
    : null;

  return { days, average, loggedDays: logged.length };
}

/** One heatmap cell per day in the window. */
export function buildActivityMatrix(
  logs: { workouts: Date[]; foods: Date[]; measurements: Date[] },
  options: { days: number; now: Date; timeZone?: string },
): ActivityCell[] {
  const timeZone = options.timeZone ?? DEFAULT_TIME_ZONE;
  const counts = new Map<string, number>();

  for (const group of [logs.workouts, logs.foods, logs.measurements]) {
    for (const at of group) {
      const key = dayKey(at, timeZone);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  const cells: ActivityCell[] = [];
  for (let index = options.days - 1; index >= 0; index -= 1) {
    const date = new Date(options.now.getTime() - index * DAY_MS);
    const key = dayKey(date, timeZone);
    const count = counts.get(key) ?? 0;
    const level: ActivityCell["level"] = count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : 3;
    cells.push({ date: key, count, level });
  }

  return cells;
}

/** Longest run of consecutive active days anywhere in the supplied dates. */
export function longestStreak(
  dates: Date[],
  timeZone: string = DEFAULT_TIME_ZONE,
): number {
  const keys = [...new Set(dates.map((date) => dayKey(date, timeZone)))].sort();
  let best = 0;
  let run = 0;
  let previous: string | null = null;

  for (const key of keys) {
    run = previous && previousDayKey(key) === previous ? run + 1 : 1;
    previous = key;
    if (run > best) best = run;
  }

  return best;
}

/** Whole days since the most recent log (null when nothing was ever logged). */
export function daysSinceLastLog(
  dates: Date[],
  now: Date,
  timeZone: string = DEFAULT_TIME_ZONE,
): number | null {
  if (dates.length === 0) return null;
  const latest = dates.reduce((max, date) => (date.getTime() > max.getTime() ? date : max));
  const gap = daysBetweenKeys(dayKey(latest, timeZone), dayKey(now, timeZone));
  return gap < 0 ? 0 : gap;
}

/** "12 Oct" — short date for chart axes. */
export function shortDate(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** Compact numbers for axis labels: 12500 → 12.5k */
export function compactNumber(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${round(value / 1_000_000, 1)}m`;
  if (Math.abs(value) >= 1000) return `${round(value / 1000, 1)}k`;
  return `${Math.round(value)}`;
}
