import { describe, expect, it } from "vitest";
import {
  accessDeadline,
  addDays,
  daysLeft,
  fallbackPeriodEnd,
  GRACE_DAYS,
  monthlyRecurringKobo,
  parsePaystackDate,
  subscriptionGrantsAccess,
  subscriptionLabel,
  subscriptionSummary,
  subscriptionTone,
} from "@/lib/subscription-core";

const NOW = new Date("2026-10-26T12:00:00Z");
const periodEnd = new Date("2026-11-26T12:00:00Z");

describe("subscriptionGrantsAccess", () => {
  it("gives access while the paid period is running", () => {
    expect(
      subscriptionGrantsAccess({ status: "ACTIVE", currentPeriodEnd: periodEnd }, NOW),
    ).toBe(true);
  });

  it("stops access once an active period has expired", () => {
    expect(
      subscriptionGrantsAccess(
        { status: "ACTIVE", currentPeriodEnd: new Date("2026-10-20T12:00:00Z") },
        NOW,
      ),
    ).toBe(false);
  });

  it("keeps the paid time after cancelling", () => {
    for (const status of ["NON_RENEWING", "CANCELLED"] as const) {
      expect(subscriptionGrantsAccess({ status, currentPeriodEnd: periodEnd }, NOW)).toBe(true);
      expect(
        subscriptionGrantsAccess(
          { status, currentPeriodEnd: new Date("2026-10-01T00:00:00Z") },
          NOW,
        ),
      ).toBe(false);
    }
  });

  it("adds a grace window after a failed renewal", () => {
    const failedOn = new Date("2026-10-25T12:00:00Z");
    // Inside the grace window.
    expect(
      subscriptionGrantsAccess(
        { status: "PAST_DUE", currentPeriodEnd: failedOn },
        new Date("2026-10-27T12:00:00Z"),
      ),
    ).toBe(true);
    // Past the grace window.
    expect(
      subscriptionGrantsAccess(
        { status: "PAST_DUE", currentPeriodEnd: failedOn },
        new Date("2026-10-29T13:00:00Z"),
      ),
    ).toBe(false);
    expect(
      accessDeadline({ status: "PAST_DUE", currentPeriodEnd: failedOn }).toISOString(),
    ).toBe(addDays(failedOn, GRACE_DAYS).toISOString());
  });

  it("never revives a completed subscription", () => {
    expect(subscriptionGrantsAccess({ status: "COMPLETE", currentPeriodEnd: periodEnd }, NOW)).toBe(
      false,
    );
    expect(
      subscriptionGrantsAccess(
        { status: "COMPLETE", currentPeriodEnd: new Date("2030-01-01T00:00:00Z") },
        NOW,
      ),
    ).toBe(false);
  });
});

describe("daysLeft", () => {
  it("rounds up partial days and clamps at zero", () => {
    expect(daysLeft({ status: "ACTIVE", currentPeriodEnd: periodEnd }, NOW)).toBe(31);
    expect(
      daysLeft(
        { status: "ACTIVE", currentPeriodEnd: new Date("2026-10-26T18:00:00Z") },
        NOW,
      ),
    ).toBe(1);
    expect(
      daysLeft(
        { status: "ACTIVE", currentPeriodEnd: new Date("2026-10-01T00:00:00Z") },
        NOW,
      ),
    ).toBe(0);
  });
});

describe("labels and summaries", () => {
  it("labels every status", () => {
    expect(subscriptionLabel("ACTIVE")).toBe("Active");
    expect(subscriptionLabel("PAST_DUE")).toBe("Payment failed");
    expect(subscriptionTone("PAST_DUE")).toBe("danger");
    expect(subscriptionTone("ACTIVE")).toBe("success");
  });

  it("describes the next thing that happens", () => {
    expect(subscriptionSummary({ status: "ACTIVE", currentPeriodEnd: periodEnd }, NOW)).toBe(
      "Renews in 31 days",
    );
    expect(
      subscriptionSummary(
        { status: "NON_RENEWING", currentPeriodEnd: new Date("2026-10-27T12:00:00Z") },
        NOW,
      ),
    ).toBe("Access ends in 1 day");
    expect(
      subscriptionSummary({ status: "COMPLETE", currentPeriodEnd: periodEnd }, NOW),
    ).toBe("Ended");
  });
});

describe("fallbackPeriodEnd", () => {
  it("moves one month forward and clamps short months", () => {
    expect(fallbackPeriodEnd(new Date("2026-10-26T09:30:00Z")).toISOString()).toBe(
      "2026-11-26T09:30:00.000Z",
    );
    expect(fallbackPeriodEnd(new Date("2026-01-31T00:00:00Z")).toISOString()).toBe(
      "2026-02-28T00:00:00.000Z",
    );
    expect(fallbackPeriodEnd(new Date("2026-12-15T00:00:00Z")).toISOString()).toBe(
      "2027-01-15T00:00:00.000Z",
    );
  });
});

describe("parsePaystackDate", () => {
  it("accepts ISO strings and rejects junk", () => {
    expect(parsePaystackDate("2026-11-26T00:00:00.000Z")?.toISOString()).toBe(
      "2026-11-26T00:00:00.000Z",
    );
    expect(parsePaystackDate("not a date")).toBeNull();
    expect(parsePaystackDate(null)).toBeNull();
    expect(parsePaystackDate("")).toBeNull();
  });
});

describe("monthlyRecurringKobo", () => {
  it("sums active amounts and ignores rubbish", () => {
    expect(monthlyRecurringKobo([2_000_000, 2_500_000, 3_000_000])).toBe(7_500_000);
    expect(monthlyRecurringKobo([])).toBe(0);
    expect(monthlyRecurringKobo([2_000_000, Number.NaN])).toBe(2_000_000);
  });
});
