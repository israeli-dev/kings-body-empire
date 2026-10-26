/**
 * Subscription rules that do not touch the database.
 *
 * Keeping the maths here means the access rule (the part that decides whether
 * someone can use a program they paid for) is unit-testable, and both the
 * dashboard and the API answer the same way.
 */

export type SubscriptionStatusName =
  | "ACTIVE"
  | "NON_RENEWING"
  | "PAST_DUE"
  | "CANCELLED"
  | "COMPLETE";

/** A failed renewal keeps access for this many days while Paystack retries. */
export const GRACE_DAYS = 3;

/** Days added to the referrer and the referee when a referral converts. */
export const REFERRAL_REWARD_DAYS = 7;

export const DAY_MS = 24 * 60 * 60 * 1000;

export type AccessInput = {
  status: SubscriptionStatusName;
  currentPeriodEnd: Date | string;
};

export function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

export function addDays(date: Date | string, days: number): Date {
  return new Date(toDate(date).getTime() + days * DAY_MS);
}

/** The moment access finally stops, including the grace period. */
export function accessDeadline(
  subscription: AccessInput,
  graceDays: number = GRACE_DAYS,
): Date {
  const end = toDate(subscription.currentPeriodEnd);
  return subscription.status === "PAST_DUE" ? addDays(end, graceDays) : end;
}

/**
 * Whether a subscription grants access right now.
 *
 *  - ACTIVE / NON_RENEWING / CANCELLED → paid up to `currentPeriodEnd`
 *    (a cancellation never takes back time the client already paid for)
 *  - PAST_DUE → paid period plus GRACE_DAYS while Paystack retries the card
 *  - COMPLETE → nothing left to give
 */
export function subscriptionGrantsAccess(
  subscription: AccessInput,
  now: Date = new Date(),
): boolean {
  if (subscription.status === "COMPLETE") return false;
  return now.getTime() <= accessDeadline(subscription).getTime();
}

/** Whole days left before access stops (0 when it has already stopped). */
export function daysLeft(
  subscription: AccessInput,
  now: Date = new Date(),
): number {
  const ms = accessDeadline(subscription).getTime() - now.getTime();
  return ms <= 0 ? 0 : Math.ceil(ms / DAY_MS);
}

const LABELS: Record<SubscriptionStatusName, string> = {
  ACTIVE: "Active",
  NON_RENEWING: "Ending",
  PAST_DUE: "Payment failed",
  CANCELLED: "Cancelled",
  COMPLETE: "Ended",
};

const TONES: Record<SubscriptionStatusName, "success" | "warning" | "danger" | "muted"> = {
  ACTIVE: "success",
  NON_RENEWING: "warning",
  PAST_DUE: "danger",
  CANCELLED: "muted",
  COMPLETE: "muted",
};

export function subscriptionLabel(status: SubscriptionStatusName): string {
  return LABELS[status] ?? status;
}

export function subscriptionTone(
  status: SubscriptionStatusName,
): "success" | "warning" | "danger" | "muted" {
  return TONES[status] ?? "muted";
}

/** One line the dashboard can show without conditions leaking everywhere. */
export function subscriptionSummary(
  subscription: AccessInput,
  now: Date = new Date(),
): string {
  const left = daysLeft(subscription, now);
  switch (subscription.status) {
    case "ACTIVE":
      return left > 0 ? `Renews in ${left} day${left === 1 ? "" : "s"}` : "Renewal is due";
    case "NON_RENEWING":
    case "CANCELLED":
      return left > 0
        ? `Access ends in ${left} day${left === 1 ? "" : "s"}`
        : "Access has ended";
    case "PAST_DUE":
      return left > 0
        ? `Card declined — ${left} day${left === 1 ? "" : "s"} of access left`
        : "Access has ended";
    case "COMPLETE":
      return "Ended";
    default:
      return "Unknown status";
  }
}

/**
 * Next billing date when Paystack has not told us one yet.
 * Clamps to the last day of the month so 31 January bills on 28 February
 * instead of skipping into March.
 */
export function fallbackPeriodEnd(from: Date): Date {
  const next = new Date(from.getTime());
  const day = from.getDate();
  next.setDate(1);
  next.setMonth(next.getMonth() + 1);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, lastDay));
  return next;
}

/** Paystack reports dates as ISO strings; treat anything unparseable as absent. */
export function parsePaystackDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Good enough for MRR: every active subscription is billed monthly. */
export function monthlyRecurringKobo(amounts: number[]): number {
  return amounts.reduce((sum, amount) => sum + (Number.isFinite(amount) ? amount : 0), 0);
}
