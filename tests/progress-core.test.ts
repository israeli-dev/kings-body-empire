import { describe, expect, it } from "vitest";
import {
  buildActivityMatrix,
  buildCalorieSeries,
  buildVolumeSeries,
  buildWeightSeries,
  compactNumber,
  daysBetweenKeys,
  daysSinceLastLog,
  longestStreak,
  parseRange,
  shortDate,
  weekStartKey,
  windowStartKey,
} from "@/lib/progress-core";

const TZ = "Africa/Lagos";
const NOW = new Date("2026-10-26T12:00:00Z"); // Monday, 13:00 in Lagos

function at(day: number, hour = 12, minute = 0) {
  return new Date(Date.UTC(2026, 9, day, hour, minute));
}

describe("range helpers", () => {
  it("defaults to 30 days and accepts 90", () => {
    expect(parseRange("90")).toBe(90);
    expect(parseRange("30")).toBe(30);
    expect(parseRange("banana")).toBe(30);
    expect(parseRange(undefined)).toBe(30);
  });

  it("finds the first day of the window", () => {
    // 30 days ending today = 29 days back.
    expect(windowStartKey(30, NOW, TZ)).toBe("2026-09-27");
    expect(windowStartKey(1, NOW, TZ)).toBe("2026-10-26");
  });

  it("snaps a date back to Monday", () => {
    expect(weekStartKey("2026-10-26")).toBe("2026-10-26"); // Monday
    expect(weekStartKey("2026-10-29")).toBe("2026-10-26"); // Thursday
    expect(weekStartKey("2026-11-01")).toBe("2026-10-26"); // Sunday
  });

  it("counts days between keys", () => {
    expect(daysBetweenKeys("2026-10-01", "2026-10-26")).toBe(25);
    expect(daysBetweenKeys("2026-10-26", "2026-10-26")).toBe(0);
  });
});

describe("buildWeightSeries", () => {
  it("keeps the last reading of each day, oldest first", () => {
    const series = buildWeightSeries(
      [
        { loggedAt: at(20, 7), weightKg: 88.4 },
        { loggedAt: at(22, 7), weightKg: 87.9 },
        { loggedAt: at(22, 19), weightKg: 87.4 },
        { loggedAt: at(24), weightKg: 86.8 },
      ],
      { days: 30, now: NOW, timeZone: TZ },
    );

    expect(series.points).toEqual([
      { date: "2026-10-20", weightKg: 88.4 },
      { date: "2026-10-22", weightKg: 87.4 },
      { date: "2026-10-24", weightKg: 86.8 },
    ]);
    expect(series.latestKg).toBe(86.8);
    expect(series.firstKg).toBe(88.4);
    expect(series.changeKg).toBe(-1.6);
  });

  it("ignores empty weights and readings outside the window", () => {
    const series = buildWeightSeries(
      [
        { loggedAt: new Date("2026-08-01T12:00:00Z"), weightKg: 95 },
        { loggedAt: at(25), weightKg: null },
      ],
      { days: 30, now: NOW, timeZone: TZ },
    );
    expect(series.points).toEqual([]);
    expect(series.changeKg).toBeNull();
    expect(series.latestKg).toBeNull();
  });

  it("has no trend with a single reading", () => {
    const series = buildWeightSeries([{ loggedAt: at(25), weightKg: 90 }], {
      days: 30,
      now: NOW,
      timeZone: TZ,
    });
    expect(series.changeKg).toBeNull();
    expect(series.latestKg).toBe(90);
  });
});

describe("buildVolumeSeries", () => {
  it("adds sets × reps × load into the right week", () => {
    const series = buildVolumeSeries(
      [
        { loggedAt: at(19), sets: 3, reps: 10, weightKg: 100 }, // 3000
        { loggedAt: at(20), sets: 4, reps: 5, weightKg: 100 }, // 2000
        { loggedAt: at(26), sets: 3, reps: 10, weightKg: 60 }, // 1800
      ],
      { weeks: 2, now: NOW, timeZone: TZ },
    );

    expect(series.weeks).toHaveLength(2);
    expect(series.weeks[0]).toEqual({ weekStart: "2026-10-19", volumeKg: 5000, sessions: 2 });
    expect(series.weeks[1]).toEqual({ weekStart: "2026-10-26", volumeKg: 1800, sessions: 1 });
    expect(series.totalVolumeKg).toBe(6800);
    expect(series.totalSessions).toBe(3);
  });

  it("counts bodyweight work as reps only, not zero", () => {
    const series = buildVolumeSeries(
      [{ loggedAt: at(26), sets: 4, reps: 10, weightKg: null }],
      { weeks: 1, now: NOW, timeZone: TZ },
    );
    expect(series.weeks[0].volumeKg).toBe(40);
  });

  it("fills quiet weeks with zero", () => {
    const series = buildVolumeSeries([], { weeks: 3, now: NOW, timeZone: TZ });
    expect(series.weeks.map((week) => week.weekStart)).toEqual([
      "2026-10-12",
      "2026-10-19",
      "2026-10-26",
    ]);
    expect(series.weeks.every((week) => week.volumeKg === 0)).toBe(true);
  });
});

describe("buildCalorieSeries", () => {
  it("totals calories per day and averages over logged days only", () => {
    const series = buildCalorieSeries(
      [
        { loggedAt: at(25, 9), calories: 700 },
        { loggedAt: at(25, 20), calories: 1100 },
        { loggedAt: at(26, 8), calories: 500 },
        { loggedAt: at(26, 9), calories: null },
      ],
      { days: 3, now: NOW, timeZone: TZ },
    );

    expect(series.days).toEqual([
      { date: "2026-10-24", calories: 0 },
      { date: "2026-10-25", calories: 1800 },
      { date: "2026-10-26", calories: 500 },
    ]);
    expect(series.loggedDays).toBe(2);
    expect(series.average).toBe(1150);
  });

  it("reports no average when nothing was logged", () => {
    const series = buildCalorieSeries([], { days: 7, now: NOW, timeZone: TZ });
    expect(series.average).toBeNull();
    expect(series.loggedDays).toBe(0);
  });
});

describe("buildActivityMatrix", () => {
  it("levels each day by how much was logged", () => {
    const cells = buildActivityMatrix(
      {
        workouts: [at(26, 8)],
        foods: [at(25, 9), at(25, 20)],
        measurements: [at(24, 7), at(24, 8), at(24, 9), at(24, 10)],
      },
      { days: 4, now: NOW, timeZone: TZ },
    );

    expect(cells.map((cell) => cell.date)).toEqual([
      "2026-10-23",
      "2026-10-24",
      "2026-10-25",
      "2026-10-26",
    ]);
    expect(cells.map((cell) => cell.level)).toEqual([0, 3, 2, 1]);
    expect(cells[0].count).toBe(0);
  });
});

describe("streaks", () => {
  it("finds the longest consecutive run", () => {
    const dates = [at(10), at(11), at(12), at(14), at(15), at(16), at(17)];
    expect(longestStreak(dates, TZ)).toBe(4);
    expect(longestStreak([], TZ)).toBe(0);
  });

  it("counts days since the last log", () => {
    expect(daysSinceLastLog([], NOW, TZ)).toBeNull();
    expect(daysSinceLastLog([at(26, 8)], NOW, TZ)).toBe(0);
    expect(daysSinceLastLog([at(23, 8), at(20, 8)], NOW, TZ)).toBe(3);
  });
});

describe("formatting", () => {
  it("shortens axis numbers", () => {
    expect(compactNumber(950)).toBe("950");
    expect(compactNumber(12_500)).toBe("12.5k");
    expect(compactNumber(2_400_000)).toBe("2.4m");
  });

  it("formats day keys for chart labels", () => {
    expect(shortDate("2026-10-05")).toBe("5 Oct");
  });
});
