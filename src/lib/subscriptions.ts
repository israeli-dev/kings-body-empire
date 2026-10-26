import { prisma } from "./prisma";
import { paymentsEnabled } from "./env";
import {
  createPlan,
  disableSubscription,
  enableSubscription,
  listSubscriptions,
  type PaystackSubscription,
} from "./paystack";
import {
  addDays,
  daysLeft,
  fallbackPeriodEnd,
  parsePaystackDate,
  subscriptionGrantsAccess,
  subscriptionLabel,
  subscriptionSummary,
  subscriptionTone,
  type SubscriptionStatusName,
} from "./subscription-core";

type PackageForPlan = {
  id: string;
  slug: string;
  title: string;
  priceKobo: number;
  billingInterval: string;
  paystackPlanCode?: string | null;
  paystackPlanAmountKobo?: number | null;
};

/**
 * Returns the Paystack plan for a program, creating it the first time and
 * whenever the price has changed. Existing subscribers stay on the old plan —
 * which is exactly what you want: a price rise never silently re-prices someone.
 */
export async function ensurePaystackPlan(
  pkg: PackageForPlan,
): Promise<{ ok: true; planCode: string } | { ok: false; message: string }> {
  if (!paymentsEnabled()) {
    return {
      ok: false,
      message:
        "Payments are not switched on yet. Add PAYSTACK_SECRET_KEY to .env and restart the server.",
    };
  }

  if (pkg.paystackPlanCode && pkg.paystackPlanAmountKobo === pkg.priceKobo) {
    return { ok: true, planCode: pkg.paystackPlanCode };
  }

  const plan = await createPlan({
    name: `${pkg.title} — monthly`,
    amountKobo: pkg.priceKobo,
    interval: "monthly",
    description: `Kings Body Empire ${pkg.title} program, billed monthly.`,
  });

  if (!plan.ok) return { ok: false, message: plan.message };

  await prisma.package.update({
    where: { id: pkg.id },
    data: {
      paystackPlanCode: plan.data.plan_code,
      paystackPlanAmountKobo: pkg.priceKobo,
    },
  });

  return { ok: true, planCode: plan.data.plan_code };
}

const STATUS_MAP: Record<string, SubscriptionStatusName> = {
  active: "ACTIVE",
  "non-renewing": "NON_RENEWING",
  "non_renewing": "NON_RENEWING",
  attention: "PAST_DUE",
  "past_due": "PAST_DUE",
  cancelled: "CANCELLED",
  canceled: "CANCELLED",
  complete: "COMPLETE",
  completed: "COMPLETE",
};

export function mapPaystackStatus(value: unknown): SubscriptionStatusName | null {
  if (typeof value !== "string") return null;
  return STATUS_MAP[value.trim().toLowerCase()] ?? null;
}

/** Writes (or refreshes) the local subscription row for a Paystack subscription. */
export async function saveSubscription(input: {
  userId: string;
  packageId: string;
  subscriptionCode: string;
  emailToken: string;
  status: SubscriptionStatusName;
  amountKobo: number;
  currentPeriodEnd: Date;
  nextPaymentDate?: Date | null;
}) {
  const existing = await prisma.subscription.findUnique({
    where: { userId_packageId: { userId: input.userId, packageId: input.packageId } },
    select: { id: true, status: true, currentPeriodEnd: true },
  });

  let currentPeriodEnd = input.currentPeriodEnd;
  let nextPaymentDate = input.nextPaymentDate ?? input.currentPeriodEnd;

  // Banked referral days attach to the next period that starts, which is either
  // a brand-new subscription or one whose paid time has already run out.
  const stillPaid =
    existing !== null &&
    subscriptionGrantsAccess(
      {
        status: existing.status as SubscriptionStatusName,
        currentPeriodEnd: existing.currentPeriodEnd,
      },
      new Date(),
    );

  if (!stillPaid) {
    // Referral bonus days earned before they had a plan are applied here, once.
    const owner = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { referralBonusDays: true },
    });
    const bonusDays = owner?.referralBonusDays ?? 0;
    if (bonusDays > 0) {
      currentPeriodEnd = addDays(currentPeriodEnd, bonusDays);
      nextPaymentDate = addDays(nextPaymentDate, bonusDays);
      await prisma.user.update({
        where: { id: input.userId },
        data: { referralBonusDays: 0 },
      });
    }
  }

  const data = {
    subscriptionCode: input.subscriptionCode,
    emailToken: input.emailToken,
    status: input.status,
    amountKobo: input.amountKobo,
    currentPeriodEnd,
    nextPaymentDate,
    cancelledAt: input.status === "CANCELLED" ? new Date() : null,
  };

  try {
    return await prisma.subscription.upsert({
      where: { userId_packageId: { userId: input.userId, packageId: input.packageId } },
      create: { userId: input.userId, packageId: input.packageId, ...data },
      update: data,
    });
  } catch {
    // A very old row can still hold this subscription code (e.g. the client
    // cancelled and re-subscribed). Update by code instead of failing the webhook.
    return prisma.subscription.update({
      where: { subscriptionCode: input.subscriptionCode },
      data,
    });
  }
}

/** Finds the program a Paystack plan belongs to. */
export async function packageForPlanCode(planCode: string | undefined) {
  if (!planCode) return null;
  return prisma.package.findFirst({
    where: { paystackPlanCode: planCode },
    select: {
      id: true,
      title: true,
      priceKobo: true,
      billingInterval: true,
      paystackPlanCode: true,
    },
  });
}

/**
 * Pulls a subscription from Paystack after checkout. The `subscription.create`
 * webhook is the usual path, but a webhook cannot reach a laptop on localhost,
 * so the browser callback asks Paystack directly as a safety net.
 */
export async function syncSubscriptionFromPaystack(input: {
  userId: string;
  email: string;
  pkg: PackageForPlan;
}): Promise<{ ok: boolean; message?: string }> {
  if (!input.pkg.paystackPlanCode) {
    return { ok: false, message: "That program has no Paystack plan yet." };
  }

  const listed = await listSubscriptions({
    customer: input.email,
    plan: input.pkg.paystackPlanCode,
  });
  if (!listed.ok) return { ok: false, message: listed.message };

  const match =
    listed.data.find((row) => mapPaystackStatus(row.status) === "ACTIVE") ??
    listed.data.find((row) => mapPaystackStatus(row.status) === "NON_RENEWING") ??
    listed.data[0];

  if (!match?.subscription_code || !match.email_token) {
    return {
      ok: false,
      message: "Paystack has not created the subscription yet — it will appear in a moment.",
    };
  }

  await saveSubscription({
    userId: input.userId,
    packageId: input.pkg.id,
    subscriptionCode: match.subscription_code,
    emailToken: match.email_token,
    status: mapPaystackStatus(match.status) ?? "ACTIVE",
    amountKobo: match.amount ?? input.pkg.priceKobo,
    currentPeriodEnd: parsePaystackDate(match.next_payment_date) ?? fallbackPeriodEnd(new Date()),
    nextPaymentDate: parsePaystackDate(match.next_payment_date),
  });

  return { ok: true };
}

export type SubscriptionWebhookData = {
  subscription_code?: string;
  email_token?: string;
  status?: string;
  amount?: number;
  next_payment_date?: string | null;
  plan?: { plan_code?: string; amount?: number; name?: string } | null;
  customer?: { email?: string } | null;
};

/** Handles subscription.* webhooks. Returns a short note for the logs. */
export async function handleSubscriptionEvent(
  event: string,
  data: SubscriptionWebhookData,
): Promise<string> {
  const code = data.subscription_code;
  if (!code) return "no subscription code";

  const status = mapPaystackStatus(data.status);
  if (!status) return `unmapped status "${data.status}"`;

  if (event === "subscription.create") {
    const planCode = data.plan?.plan_code;
    const pkg = await packageForPlanCode(planCode);
    const email = data.customer?.email?.trim().toLowerCase();
    const user = email
      ? await prisma.user.findUnique({ where: { email }, select: { id: true } })
      : null;

    if (!pkg || !user || !data.email_token) return "subscription.create ignored (no plan/user match)";

    const periodEnd = parsePaystackDate(data.next_payment_date) ?? fallbackPeriodEnd(new Date());

    await saveSubscription({
      userId: user.id,
      packageId: pkg.id,
      subscriptionCode: code,
      emailToken: data.email_token,
      status,
      amountKobo: data.amount ?? pkg.priceKobo,
      currentPeriodEnd: periodEnd,
      nextPaymentDate: periodEnd,
    });

    return `subscription ${code} linked to ${user.id}`;
  }

  const existing = await prisma.subscription.findUnique({
    where: { subscriptionCode: code },
    select: { id: true, status: true },
  });
  if (!existing) return `subscription ${code} not found locally`;

  await prisma.subscription.update({
    where: { subscriptionCode: code },
    data: {
      status,
      cancelledAt: status === "CANCELLED" ? new Date() : null,
    },
  });

  return `subscription ${code} → ${status}`;
}

type InvoiceWebhookData = {
  invoice_code?: string;
  status?: string;
  amount?: number;
  paid?: boolean;
  paid_at?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  subscription?: { subscription_code?: string; email_token?: string } | null;
  transaction?: { reference?: string } | null;
};

/**
 * Handles invoice.create / invoice.update / invoice.payment_failed.
 * The invoice code is unique, so a replayed webhook cannot extend access twice.
 */
export async function handleInvoiceEvent(
  event: string,
  data: InvoiceWebhookData,
): Promise<string> {
  const invoiceCode = data.invoice_code;
  const subscriptionCode = data.subscription?.subscription_code;
  if (!invoiceCode) return "no invoice code";
  if (!subscriptionCode) return "no subscription code";

  const subscription = await prisma.subscription.findUnique({
    where: { subscriptionCode },
    select: { id: true, status: true, currentPeriodEnd: true },
  });
  if (!subscription) return `subscription ${subscriptionCode} not found locally`;

  const failed = event === "invoice.payment_failed";
  const paid = !failed && (data.paid === true || data.status === "success");
  const status = paid ? "PAID" : failed ? "FAILED" : "PENDING";
  const periodStart = parsePaystackDate(data.period_start);
  const periodEnd = parsePaystackDate(data.period_end);

  const existingInvoice = await prisma.invoice.findUnique({
    where: { invoiceCode },
    select: { id: true, status: true },
  });
  if (existingInvoice?.status === "PAID" && !paid) {
    // Never undo a receipt because an older event arrived late.
    return `invoice ${invoiceCode} already paid — ignored`;
  }

  await prisma.invoice.upsert({
    where: { invoiceCode },
    create: {
      subscriptionId: subscription.id,
      invoiceCode,
      reference: data.transaction?.reference ?? null,
      amountKobo: data.amount ?? 0,
      status,
      periodStart,
      periodEnd,
      paidAt: paid ? parsePaystackDate(data.paid_at) ?? new Date() : null,
    },
    update: {
      status,
      reference: data.transaction?.reference ?? null,
      paidAt: paid ? parsePaystackDate(data.paid_at) ?? new Date() : null,
      periodStart,
      periodEnd,
    },
  });

  if (paid) {
    const nextEnd = periodEnd ?? fallbackPeriodEnd(subscription.currentPeriodEnd);
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: subscription.status === "NON_RENEWING" ? "NON_RENEWING" : "ACTIVE",
        currentPeriodEnd: nextEnd,
        nextPaymentDate: nextEnd,
      },
    });
  } else if (failed) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: "PAST_DUE" },
    });
  }

  return `invoice ${invoiceCode} → ${status}`;
}

/** Cancels billing in Paystack, then records it locally. Paid time is kept. */
export async function cancelSubscription(userId: string, subscriptionId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: { id: subscriptionId, userId },
  });
  if (!subscription) return { ok: false as const, message: "Subscription not found." };
  if (subscription.status === "CANCELLED" || subscription.status === "COMPLETE") {
    return { ok: true as const, status: subscription.status as SubscriptionStatusName };
  }

  const disabled = await disableSubscription({
    code: subscription.subscriptionCode,
    token: subscription.emailToken,
  });
  if (!disabled.ok) {
    return {
      ok: false as const,
      message:
        disabled.message ||
        "Paystack could not cancel that subscription. Please contact support.",
    };
  }

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { status: "NON_RENEWING", cancelledAt: new Date() },
  });

  return { ok: true as const, status: "NON_RENEWING" as SubscriptionStatusName };
}

/** Turns billing back on before the paid period ends. */
export async function reactivateSubscription(userId: string, subscriptionId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: { id: subscriptionId, userId },
  });
  if (!subscription) return { ok: false as const, message: "Subscription not found." };
  if (subscription.status === "ACTIVE") {
    return { ok: true as const, status: "ACTIVE" as SubscriptionStatusName };
  }
  if (subscription.status === "COMPLETE") {
    return {
      ok: false as const,
      message: "That subscription has ended. Start a new one from the programs page.",
    };
  }

  const enabled = await enableSubscription({
    code: subscription.subscriptionCode,
    token: subscription.emailToken,
  });
  if (!enabled.ok) {
    return {
      ok: false as const,
      message: enabled.message || "Paystack could not reactivate that subscription.",
    };
  }

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { status: "ACTIVE", cancelledAt: null },
  });

  return { ok: true as const, status: "ACTIVE" as SubscriptionStatusName };
}

export type SubscriptionView = {
  id: string;
  packageId: string;
  packageTitle: string;
  packageSlug: string;
  status: SubscriptionStatusName;
  statusLabel: string;
  tone: "success" | "warning" | "danger" | "muted";
  summary: string;
  amountKobo: number;
  currentPeriodEnd: string;
  nextPaymentDate: string | null;
  daysLeft: number;
  canCancel: boolean;
  canReactivate: boolean;
};

/** Everything the dashboard and the API need, already formatted. */
export async function getUserSubscriptions(
  userId: string,
  now: Date = new Date(),
): Promise<SubscriptionView[]> {
  const rows = await prisma.subscription.findMany({
    where: { userId },
    include: { package: { select: { title: true, slug: true } } },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((row) => {
    const status = row.status as SubscriptionStatusName;
    const input = { status, currentPeriodEnd: row.currentPeriodEnd };
    return {
      id: row.id,
      packageId: row.packageId,
      packageTitle: row.package.title,
      packageSlug: row.package.slug,
      status,
      statusLabel: subscriptionLabel(status),
      tone: subscriptionTone(status),
      summary: subscriptionSummary(input, now),
      amountKobo: row.amountKobo,
      currentPeriodEnd: input.currentPeriodEnd.toISOString(),
      nextPaymentDate: row.nextPaymentDate ? row.nextPaymentDate.toISOString() : null,
      daysLeft: daysLeft(input, now),
      canCancel: status === "ACTIVE" || status === "PAST_DUE",
      canReactivate: status === "NON_RENEWING" || status === "CANCELLED",
    };
  });
}

/**
 * The single access rule. Legacy one-off purchases only count for ONE_OFF
 * programs — otherwise the first month of a subscription would unlock forever.
 */
export async function hasActiveProgramAccess(
  userId: string,
  packageId: string,
  now: Date = new Date(),
): Promise<boolean> {
  const [subscription, pkg] = await Promise.all([
    prisma.subscription.findUnique({
      where: { userId_packageId: { userId, packageId } },
      select: { status: true, currentPeriodEnd: true },
    }),
    prisma.package.findUnique({
      where: { id: packageId },
      select: { billingInterval: true },
    }),
  ]);

  if (
    subscription &&
    subscriptionGrantsAccess(
      {
        status: subscription.status as SubscriptionStatusName,
        currentPeriodEnd: subscription.currentPeriodEnd,
      },
      now,
    )
  ) {
    return true;
  }

  if (pkg?.billingInterval !== "ONE_OFF") return false;

  const legacy = await prisma.packagePurchase.findFirst({
    where: { userId, packageId, status: "PAID" },
    select: { id: true },
  });
  return Boolean(legacy);
}

/** Which program ids the client can currently open. */
export async function packageIdsWithAccess(
  userId: string,
  now: Date = new Date(),
): Promise<string[]> {
  const [subscriptions, purchases] = await Promise.all([
    prisma.subscription.findMany({
      where: { userId },
      select: { packageId: true, status: true, currentPeriodEnd: true },
    }),
    prisma.packagePurchase.findMany({
      where: { userId, status: "PAID" },
      select: { packageId: true, package: { select: { billingInterval: true } } },
    }),
  ]);

  const ids = new Set<string>();
  for (const subscription of subscriptions) {
    if (
      subscriptionGrantsAccess(
        {
          status: subscription.status as SubscriptionStatusName,
          currentPeriodEnd: subscription.currentPeriodEnd,
        },
        now,
      )
    ) {
      ids.add(subscription.packageId);
    }
  }
  for (const purchase of purchases) {
    if (purchase.package.billingInterval === "ONE_OFF") ids.add(purchase.packageId);
  }
  return [...ids];
}

/** Used to decide whether a client should be sent to checkout or to the program. */
export async function subscriptionForPackage(userId: string, packageId: string) {
  return prisma.subscription.findUnique({
    where: { userId_packageId: { userId, packageId } },
  });
}

/** Exposed for tests and admin numbers. */
export function isPaystackSubscription(value: unknown): value is PaystackSubscription {
  return Boolean(value && typeof value === "object" && "subscription_code" in value);
}
