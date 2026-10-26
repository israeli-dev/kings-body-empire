import { describe, expect, it } from "vitest";
import {
  computeStreak,
  countActiveDays,
  dayKey,
  previousDayKey,
  rankForActiveDays,
  rankProgress,
} from "@/lib/rank-core";

const TZ = "Africa/Lagos";

function daysAgo(count: number, from = new Date("2026-10-26T12:00:00Z")) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(from);
    date.setUTCDate(date.getUTCDate() - index);
    return date;
  });
}

describe("dayKey", () => {
  it("uses the configured timezone", () => {
    // 23:30 UTC is already the next day in Lagos (UTC+1).
    expect(dayKey(new Date("2026-10-26T23:30:00Z"), TZ)).toBe("2026-10-27");
    expect(dayKey(new Date("2026-10-26T23:30:00Z"), "UTC")).toBe("2026-10-26");
  });

  it("walks back a day", () => {
    expect(previousDayKey("2026-03-01")).toBe("2026-02-28");
    expect(previousDayKey("2026-01-01")).toBe("2025-12-31");
  });
});

describe("rankForActiveDays", () => {
  it("maps days to ranks", () => {
    expect(rankForActiveDays(0)).toBe("BRONZE");
    expect(rankForActiveDays(1)).toBe("BRONZE");
    expect(rankForActiveDays(2)).toBe("SILVER");
    expect(rankForActiveDays(3)).toBe("SILVER");
    expect(rankForActiveDays(4)).toBe("GOLD");
    expect(rankForActiveDays(5)).toBe("GOLD");
    expect(rankForActiveDays(6)).toBe("DIAMOND");
    expect(rankForActiveDays(7)).toBe("DIAMOND");
  });
});

describe("countActiveDays", () => {
  const now = new Date("2026-10-26T12:00:00Z");

  it("collapses multiple logs on the same day", () => {
    const dates = [
      new Date("2026-10-26T08:00:00Z"),
      new Date("2026-10-26T18:00:00Z"),
      new Date("2026-10-25T08:00:00Z"),
    ];
    expect(countActiveDays(dates, now, 7, TZ)).toBe(2);
  });

  it("ignores days outside the window", () => {
    const dates = [new Date("2026-09-01T08:00:00Z")];
    expect(countActiveDays(dates, now, 7, TZ)).toBe(0);
  });
});

describe("computeStreak", () => {
  const now = new Date("2026-10-26T12:00:00Z");

  it("counts consecutive days ending today", () => {
    expect(computeStreak(daysAgo(4, now), now, TZ)).toBe(4);
  });

  it("keeps the streak alive if yesterday was logged but today is not yet", () => {
    const dates = [
      new Date("2026-10-25T08:00:00Z"),
      new Date("2026-10-24T08:00:00Z"),
    ];
    expect(computeStreak(dates, now, TZ)).toBe(2);
  });

  it("resets when the last activity was two days ago", () => {
    const dates = [
      new Date("2026-10-24T08:00:00Z"),
      new Date("2026-10-23T08:00:00Z"),
    ];
    expect(computeStreak(dates, now, TZ)).toBe(0);
  });

  it("returns 0 with no activity", () => {
    expect(computeStreak([], now, TZ)).toBe(0);
  });
});

describe("rankProgress", () => {
  it("describes the gap to the next rank", () => {
    const progress = rankProgress(3);
    expect(progress.rank).toBe("SILVER");
    expect(progress.nextRank).toBe("GOLD");
    expect(progress.daysToNextRank).toBe(1);
    expect(progress.atTopRank).toBe(false);
  });

  it("flags the top rank", () => {
    const progress = rankProgress(6);
    expect(progress.rank).toBe("DIAMOND");
    expect(progress.nextRank).toBeNull();
    expect(progress.atTopRank).toBe(true);
  });
});
