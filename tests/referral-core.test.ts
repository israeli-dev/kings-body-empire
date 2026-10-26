import { describe, expect, it } from "vitest";
import {
  buildReferralCode,
  cookieMaxAgeSeconds,
  normaliseReferralCode,
  randomReferralSuffix,
  referralLink,
  referralStatusLabel,
  rewardDaysFor,
  summariseReferrals,
  REFERRAL_COOKIE_DAYS,
  REFERRAL_REWARD_DAYS,
} from "@/lib/referrals-core";

describe("normaliseReferralCode", () => {
  it("uppercases and strips punctuation", () => {
    expect(normaliseReferralCode(" chin-7k3f ")).toBe("CHIN7K3F");
    expect(normaliseReferralCode("abcd")).toBe("ABCD");
  });

  it("rejects values that cannot be a code", () => {
    expect(normaliseReferralCode(null)).toBeNull();
    expect(normaliseReferralCode(undefined)).toBeNull();
    expect(normaliseReferralCode(12345)).toBeNull();
    expect(normaliseReferralCode("abc")).toBeNull();
    expect(normaliseReferralCode("")).toBeNull();
    expect(normaliseReferralCode("a".repeat(17))).toBeNull();
    expect(normaliseReferralCode("!@#$")).toBeNull();
  });
});

describe("buildReferralCode", () => {
  it("uses the first letters of the name plus the random part", () => {
    expect(buildReferralCode("Chinaza Uche", "7k3f")).toBe("CHIN7K3F");
    expect(buildReferralCode("Tunde", "ab12")).toBe("TUNDAB12");
  });

  it("stays readable and safe for a URL", () => {
    const code = buildReferralCode("Kings Body Empire", "9x2q");
    expect(code).toMatch(/^[A-Z]{2,4}[A-Z0-9]{4}$/);
    expect(normaliseReferralCode(code)).toBe(code);
  });

  it("copes with a missing name", () => {
    expect(buildReferralCode(null, "zz11")).toBe("KKZZ11");
    expect(buildReferralCode(undefined, "")).toBe("KKXXXX");
  });
});

describe("randomReferralSuffix", () => {
  it("avoids characters that look like numbers", () => {
    for (let run = 0; run < 40; run += 1) {
      const suffix = randomReferralSuffix();
      expect(suffix).toHaveLength(4);
      expect(suffix).toMatch(/^[A-HJ-NP-Z2-9]+$/);
    }
  });
});

describe("referralLink", () => {
  it("builds an absolute landing link without a double slash", () => {
    expect(referralLink("https://kingsbodyempire.com", "CHIN7K3F")).toBe(
      "https://kingsbodyempire.com/?ref=CHIN7K3F",
    );
    expect(referralLink("https://kingsbodyempire.com/", "AB12")).toBe(
      "https://kingsbodyempire.com/?ref=AB12",
    );
  });
});

describe("summariseReferrals", () => {
  it("counts invites, conversions and days earned", () => {
    const stats = summariseReferrals([
      { status: "PENDING", rewardDays: 7, createdAt: new Date(), qualifiedAt: null },
      { status: "REWARDED", rewardDays: 7, createdAt: new Date(), qualifiedAt: new Date() },
      { status: "QUALIFIED", rewardDays: 7, createdAt: new Date(), qualifiedAt: new Date() },
    ]);

    expect(stats).toEqual({
      invited: 3,
      qualified: 2,
      rewardDays: 21,
      appliedDays: 7,
    });
  });

  it("handles an empty history", () => {
    expect(summariseReferrals([])).toEqual({
      invited: 0,
      qualified: 0,
      rewardDays: 0,
      appliedDays: 0,
    });
  });
});

describe("referral copy and rewards", () => {
  it("describes every status", () => {
    expect(referralStatusLabel("PENDING")).toBe("Awaiting first payment");
    expect(referralStatusLabel("REWARDED")).toBe("Rewarded");
  });

  it("only pays out once the invite has qualified", () => {
    expect(rewardDaysFor("QUALIFIED", 7)).toBe(7);
    expect(rewardDaysFor("PENDING", 7)).toBe(0);
    expect(rewardDaysFor("REWARDED", 7)).toBe(0);
  });

  it("uses a 7-day reward and a 30-day attribution window", () => {
    expect(REFERRAL_REWARD_DAYS).toBe(7);
    expect(REFERRAL_COOKIE_DAYS).toBe(30);
    expect(cookieMaxAgeSeconds()).toBe(2_592_000);
  });
});
