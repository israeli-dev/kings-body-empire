import { prisma } from "./prisma";
import { siteUrl } from "./env";
import { sendMail, referralRewardEmail } from "./mailer";
import {
  addDays,
  REFERRAL_REWARD_DAYS,
  subscriptionGrantsAccess,
  type SubscriptionStatusName,
} from "./subscription-core";
import {
  buildReferralCode,
  normaliseReferralCode,
  randomReferralSuffix,
  referralLink,
  referralStatusLabel,
  summariseReferrals,
  type ReferralStats,
  type ReferralStatusName,
} from "./referrals-core";

/** Creates the client's shareable code on first use. Safe to call repeatedly. */
export async function ensureReferralCode(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true, name: true },
  });
  if (!user) return null;
  if (user.referralCode) return user.referralCode;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = buildReferralCode(user.name, randomReferralSuffix());
    try {
      await prisma.user.update({ where: { id: userId }, data: { referralCode: code } });
      return code;
    } catch {
      // Code already taken by another client — try another one.
    }
  }

  return null;
}

/**
 * Records that a new account was created through someone's link.
 * Ignores unknown codes, self-referrals and accounts that were already referred.
 */
export async function attributeReferral(input: {
  userId: string;
  rawCode: unknown;
}): Promise<{ attributed: boolean; referrerName?: string; message?: string }> {
  const code = normaliseReferralCode(input.rawCode);
  if (!code) return { attributed: false };

  const referrer = await prisma.user.findUnique({
    where: { referralCode: code },
    select: { id: true, name: true },
  });
  if (!referrer) return { attributed: false, message: "That referral code is not valid." };
  if (referrer.id === input.userId) return { attributed: false };

  const existing = await prisma.referral.findUnique({
    where: { refereeId: input.userId },
    select: { id: true },
  });
  if (existing) return { attributed: false };

  await prisma.user.update({
    where: { id: input.userId },
    data: { referredById: referrer.id },
  });
  await prisma.referral.create({
    data: {
      referrerId: referrer.id,
      refereeId: input.userId,
      code,
      rewardDays: REFERRAL_REWARD_DAYS,
    },
  });

  return { attributed: true, referrerName: referrer.name };
}

/**
 * Pushes out a client's paid period by `days`. If they have no live
 * subscription (a referrer who is not currently paying) the days are banked and
 * applied to their next subscription instead of being lost.
 */
export async function grantRewardDays(
  userId: string,
  days: number,
): Promise<"extended" | "banked"> {
  if (days <= 0) return "banked";

  const subscriptions = await prisma.subscription.findMany({
    where: { userId },
    select: { id: true, status: true, currentPeriodEnd: true },
    orderBy: { createdAt: "desc" },
  });

  const live = subscriptions.find((subscription) =>
    subscriptionGrantsAccess({
      status: subscription.status as SubscriptionStatusName,
      currentPeriodEnd: subscription.currentPeriodEnd,
    }),
  );

  if (!live) {
    await prisma.user.update({
      where: { id: userId },
      data: { referralBonusDays: { increment: days } },
    });
    return "banked";
  }

  await prisma.subscription.update({
    where: { id: live.id },
    data: {
      currentPeriodEnd: addDays(live.currentPeriodEnd, days),
      nextPaymentDate: addDays(live.currentPeriodEnd, days),
    },
  });
  return "extended";
}

export type ReferralInvite = {
  name: string;
  status: ReferralStatusName;
  statusLabel: string;
  joinedAt: string;
  qualifiedAt: string | null;
};

export type ReferralOverview = {
  code: string;
  link: string;
  rewardDays: number;
  bankedDays: number;
  stats: ReferralStats;
  invites: ReferralInvite[];
};

/** Everything the dashboard card needs. */
export async function getReferralOverview(userId: string): Promise<ReferralOverview> {
  const code = (await ensureReferralCode(userId)) ?? "";

  const [user, rows] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { referralBonusDays: true } }),
    prisma.referral.findMany({
      where: { referrerId: userId },
      include: { referee: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const stats = summariseReferrals(rows);

  return {
    code,
    link: code ? referralLink(siteUrl, code) : "",
    rewardDays: REFERRAL_REWARD_DAYS,
    bankedDays: user?.referralBonusDays ?? 0,
    stats,
    invites: rows.map((row) => ({
      name: row.referee.name,
      status: row.status as ReferralStatusName,
      statusLabel: referralStatusLabel(row.status as ReferralStatusName),
      joinedAt: row.createdAt.toISOString(),
      qualifiedAt: row.qualifiedAt ? row.qualifiedAt.toISOString() : null,
    })),
  };
}

/**
 * Called when a client pays for their first program.
 *
 * `Referral.refereeId` is unique and the status only moves forward, so calling
 * this from `charge.success` and from a duplicate webhook delivery is safe.
 */
export async function qualifyReferral(refereeId: string): Promise<{
  status: "none" | "rewarded";
  rewardDays?: number;
  referrerReward?: "extended" | "banked";
  refereeReward?: "extended" | "banked";
}> {
  const referral = await prisma.referral.findUnique({
    where: { refereeId },
    include: {
      referrer: { select: { id: true, name: true, email: true } },
      referee: { select: { id: true, name: true } },
    },
  });

  if (!referral || referral.status !== "PENDING") return { status: "none" };

  const now = new Date();
  await prisma.referral.update({
    where: { id: referral.id },
    data: { status: "QUALIFIED", qualifiedAt: now },
  });

  const rewardDays = referral.rewardDays > 0 ? referral.rewardDays : REFERRAL_REWARD_DAYS;
  const [referrerReward, refereeReward] = await Promise.all([
    grantRewardDays(referral.referrerId, rewardDays),
    grantRewardDays(referral.refereeId, rewardDays),
  ]);

  await prisma.referral.update({
    where: { id: referral.id },
    data: { status: "REWARDED", rewardedAt: new Date() },
  });

  // Never let an email failure undo a reward.
  try {
    const mail = referralRewardEmail({
      referrerName: referral.referrer.name,
      refereeName: referral.referee.name,
      rewardDays,
      dashboardUrl: `${siteUrl.replace(/\/$/, "")}/progress`,
    });
    await sendMail({ ...mail, to: referral.referrer.email });
  } catch (error) {
    console.error("[referrals] reward email failed:", error);
  }

  return {
    status: "rewarded",
    rewardDays,
    referrerReward,
    refereeReward,
  };
}
