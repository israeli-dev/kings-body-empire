import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api";
import { absoluteUrl, paymentsEnabled } from "@/lib/env";
import { verifyPayment } from "@/lib/paystack";
import { findPurchaseByReference, markPurchaseFailed, markPurchasePaid } from "@/lib/purchases";
import { prisma } from "@/lib/prisma";
import { syncSubscriptionFromPaystack } from "@/lib/subscriptions";

/**
 * Paystack redirects the customer's browser here after checkout.
 * We verify server-to-server, then send the user to the right page.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const reference = url.searchParams.get("reference") ?? url.searchParams.get("trxref");

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(absoluteUrl("/login?callbackUrl=%2Fdashboard"));
  }

  if (!reference) {
    return NextResponse.redirect(absoluteUrl("/checkout/failure?reason=missing-reference"));
  }

  if (!paymentsEnabled()) {
    return NextResponse.redirect(absoluteUrl("/checkout/failure?reason=payments-off"));
  }

  const purchase = await findPurchaseByReference(reference);
  if (!purchase || purchase.userId !== user.id) {
    return NextResponse.redirect(absoluteUrl("/checkout/failure?reason=unknown-reference"));
  }

  const verified = await verifyPayment(reference);
  if (!verified.ok) {
    return NextResponse.redirect(absoluteUrl(`/checkout/failure?reason=verify&ref=${reference}`));
  }

  const paid =
    verified.data.status === "success" &&
    (await markPurchasePaid(reference, verified.data.amount));

  if (!paid) {
    await markPurchaseFailed(reference);
    return NextResponse.redirect(absoluteUrl(`/checkout/failure?reason=unsuccessful&ref=${reference}`));
  }

  // Monthly programs: the subscription itself arrives by webhook. Fetch it
  // here too so checkout still works when webhooks point at a deployed URL.
  if (purchase.kind === "package") {
    const row = await prisma.packagePurchase.findUnique({
      where: { paystackRef: reference },
      include: {
        package: {
          select: {
            id: true,
            slug: true,
            title: true,
            priceKobo: true,
            billingInterval: true,
            paystackPlanCode: true,
            paystackPlanAmountKobo: true,
          },
        },
      },
    });

    if (row && row.package.billingInterval !== "ONE_OFF" && user.email) {
      await syncSubscriptionFromPaystack({
        userId: user.id,
        email: user.email,
        pkg: row.package,
      }).catch(() => undefined);
    }
  }

  return NextResponse.redirect(
    absoluteUrl(
      `/checkout/success?kind=${purchase.kind}&title=${encodeURIComponent(purchase.title)}`,
    ),
  );
}
