import { prisma } from "./prisma";
import { qualifyReferral } from "./referrals";

/** Look up a pending/paid purchase by the Paystack reference, in either table. */
export async function findPurchaseByReference(reference: string) {
  const packagePurchase = await prisma.packagePurchase.findUnique({
    where: { paystackRef: reference },
    include: { package: { select: { title: true, slug: true } } },
  });
  if (packagePurchase) {
    return {
      kind: "package" as const,
      id: packagePurchase.id,
      userId: packagePurchase.userId,
      amountKobo: packagePurchase.amountKobo,
      status: packagePurchase.status,
      title: packagePurchase.package.title,
      slug: packagePurchase.package.slug,
    };
  }

  const bookPurchase = await prisma.bookPurchase.findUnique({
    where: { paystackRef: reference },
    include: { book: { select: { title: true, slug: true } } },
  });
  if (bookPurchase) {
    return {
      kind: "book" as const,
      id: bookPurchase.id,
      userId: bookPurchase.userId,
      amountKobo: bookPurchase.amountKobo,
      status: bookPurchase.status,
      title: bookPurchase.book.title,
      slug: bookPurchase.book.slug,
    };
  }

  return null;
}

/**
 * Marks a purchase as paid. Idempotent and safe to call from both the browser
 * callback and the webhook (whichever lands first wins).
 */
export async function markPurchasePaid(reference: string, amountPaidKobo: number) {
  const purchase = await findPurchaseByReference(reference);
  if (!purchase) return { ok: false as const, reason: "NOT_FOUND" as const };

  if (amountPaidKobo < purchase.amountKobo) {
    return { ok: false as const, reason: "AMOUNT_MISMATCH" as const };
  }

  // A client's first paid program is what converts a referral into 7 free days
  // for both sides. Idempotent, so duplicate webhooks are harmless.
  if (purchase.kind === "package") {
    await qualifyReferral(purchase.userId).catch((error) => {
      console.error("[referrals] qualification failed:", error);
    });
  }

  if (purchase.status === "PAID") {
    return { ok: true as const, purchase };
  }

  if (purchase.kind === "package") {
    await prisma.packagePurchase.update({
      where: { id: purchase.id },
      data: { status: "PAID", paidAt: new Date() },
    });
  } else {
    await prisma.bookPurchase.update({
      where: { id: purchase.id },
      data: { status: "PAID", paidAt: new Date() },
    });
  }

  return { ok: true as const, purchase: { ...purchase, status: "PAID" as const } };
}

export async function markPurchaseFailed(reference: string) {
  await prisma.packagePurchase.updateMany({
    where: { paystackRef: reference, status: "PENDING" },
    data: { status: "FAILED" },
  });
  await prisma.bookPurchase.updateMany({
    where: { paystackRef: reference, status: "PENDING" },
    data: { status: "FAILED" },
  });
}

export async function hasPaidPackage(userId: string, packageId: string) {
  const purchase = await prisma.packagePurchase.findFirst({
    where: { userId, packageId, status: "PAID" },
    select: { id: true, createdAt: true },
  });
  return purchase;
}

export async function hasPaidBook(userId: string, bookId: string) {
  const purchase = await prisma.bookPurchase.findFirst({
    where: { userId, bookId, status: "PAID" },
    select: { id: true, createdAt: true },
  });
  return purchase;
}
