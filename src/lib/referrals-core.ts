/**
 * Referral rules that do not touch the database.
 *
 * The deal: someone shares their code, a friend signs up with it, and when the
 * friend pays for their first month **both sides get 7 extra days** — the
 * referrer's current period is pushed out (or the days are banked if they are
 * not subscribed yet), and so is the friend's.
 */
export const REFERRAL_COOKIE = "kbe_ref";
export const REFERRAL_COOKIE_DAYS = 30;
/** Matches REFERRAL_REWARD_DAYS in subscription-core; kept here for the copy. */
export { REFERRAL_REWARD_DAYS } from "./subscription-core";

export type ReferralStatusName = "PENDING" | "QUALIFIED" | "REWARDED";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1
const CODE_MIN = 4;
const CODE_MAX = 16;

/**
 * Cleans a code typed in a URL or a form. Returns null when it cannot be a
 * code, so a stray `?ref=newsletter` never breaks anything.
 */
export function normaliseReferralCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (cleaned.length < CODE_MIN || cleaned.length > CODE_MAX) return null;
  return cleaned;
}

/** Cheap deterministic hash so a name maps to the same stem every time. */
function stemFromName(name: string | null | undefined): string {
  const letters = (name ?? "").toUpperCase().replace(/[^A-Z]/g, "");
  return letters.slice(0, 4).padEnd(2, "K");
}

/**
 * Builds a readable code such as `CHIN7K3F`. `randomPart` is injected so the
 * result is deterministic in tests.
 */
export function buildReferralCode(
  name: string | null | undefined,
  randomPart: string,
): string {
  const random = randomPart.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const suffix = random.slice(0, 4).padEnd(4, "X");
  return `${stemFromName(name)}${suffix}`.slice(0, 10);
}

/** A fresh random part for `buildReferralCode`. */
export function randomReferralSuffix(length = 4): string {
  let out = "";
  for (let index = 0; index < length; index += 1) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

export function referralLink(siteUrl: string, code: string): string {
  const base = siteUrl.replace(/\/$/, "");
  return `${base}/?ref=${encodeURIComponent(code)}`;
}

export function cookieMaxAgeSeconds(days: number = REFERRAL_COOKIE_DAYS): number {
  return days * 24 * 60 * 60;
}

export type ReferralRow = {
  status: ReferralStatusName;
  rewardDays: number;
  createdAt: Date;
  qualifiedAt: Date | null;
};

export type ReferralStats = {
  /** Everyone who signed up with the code. */
  invited: number;
  /** Of those, how many have paid. */
  qualified: number;
  /** Days earned (or waiting) through referrals. */
  rewardDays: number;
  /** Days already applied to a subscription. */
  appliedDays: number;
};

export function summariseReferrals(rows: ReferralRow[]): ReferralStats {
  const qualified = rows.filter((row) => row.status !== "PENDING");
  return {
    invited: rows.length,
    qualified: qualified.length,
    rewardDays: rows.reduce((sum, row) => sum + Math.max(0, row.rewardDays), 0),
    appliedDays: rows
      .filter((row) => row.status === "REWARDED")
      .reduce((sum, row) => sum + Math.max(0, row.rewardDays), 0),
  };
}

export function referralStatusLabel(status: ReferralStatusName): string {
  switch (status) {
    case "PENDING":
      return "Awaiting first payment";
    case "QUALIFIED":
      return "Reward on the way";
    case "REWARDED":
      return "Rewarded";
    default:
      return status;
  }
}

/** Days to add when a reward lands on a live subscription. */
export function rewardDaysFor(status: ReferralStatusName, rewardDays: number): number {
  return status === "QUALIFIED" ? Math.max(0, rewardDays) : 0;
}
