import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  forbidden,
  getCurrentUser,
  readJson,
  serverError,
  unauthorized,
} from "@/lib/api";
import { absoluteUrl, paymentsEnabled } from "@/lib/env";
import { initializePayment } from "@/lib/paystack";
import { hasPaidBook, hasPaidPackage } from "@/lib/purchases";
import {
  ensurePaystackPlan,
  subscriptionForPackage,
} from "@/lib/subscriptions";
import { subscriptionGrantsAccess, type SubscriptionStatusName } from "@/lib/subscription-core";
import { oneOf, parseText } from "@/lib/validation";
import type { PurchasableKind } from "@/types";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (!user.email) return forbidden();

  const body = await readJson(req);
  if (!body) return badRequest("Send a JSON body with itemType and itemId.");

  const itemType = oneOf<PurchasableKind>(body.itemType, ["package", "book"]);
  const itemId = parseText(body.itemId, { min: 1, max: 60 });
  if (!itemType || !itemId) return badRequest("Tell us which item you want to buy.");

  if (!paymentsEnabled()) {
    return badRequest(
      "Payments are not switched on yet. Add your Paystack keys to .env and restart the server.",
      503,
    );
  }

  try {
    if (itemType === "package") {
      const pkg = await prisma.package.findFirst({ where: { id: itemId, isActive: true } });
      if (!pkg) return badRequest("That program is no longer available.", 404);

      const monthly = pkg.billingInterval !== "ONE_OFF";

      if (monthly) {
        // A live subscription already covers this program.
        const existing = await subscriptionForPackage(user.id, pkg.id);
        if (
          existing &&
          subscriptionGrantsAccess(
            {
              status: existing.status as SubscriptionStatusName,
              currentPeriodEnd: existing.currentPeriodEnd,
            },
          )
        ) {
          return NextResponse.json({ alreadyOwned: true, redirectUrl: "/dashboard" });
        }
      } else {
        const owned = await hasPaidPackage(user.id, pkg.id);
        if (owned) {
          return NextResponse.json({ alreadyOwned: true, redirectUrl: "/dashboard" });
        }
      }

      // The plan has to exist before the transaction, because Paystack takes
      // the amount (and the monthly renewal) from the plan itself.
      let planCode: string | undefined;
      if (monthly) {
        const plan = await ensurePaystackPlan(pkg);
        if (!plan.ok) return badRequest(plan.message, 502);
        planCode = plan.planCode;
      }

      const reference = `kbe_pkg_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
      await prisma.packagePurchase.create({
        data: {
          userId: user.id,
          packageId: pkg.id,
          amountKobo: pkg.priceKobo,
          paystackRef: reference,
        },
      });

      const result = await initializePayment({
        email: user.email,
        ...(planCode ? { plan: planCode } : { amountKobo: pkg.priceKobo }),
        reference,
        callbackUrl: absoluteUrl("/api/paystack/callback"),
        metadata: {
          kind: "package",
          packageId: pkg.id,
          userId: user.id,
          billing: monthly ? "monthly" : "one-off",
          ...(planCode ? { planCode } : {}),
        },
      });

      if (!result.ok) {
        await prisma.packagePurchase.updateMany({
          where: { paystackRef: reference },
          data: { status: "FAILED" },
        });
        return badRequest(result.message, 502);
      }

      return NextResponse.json({
        authorizationUrl: result.data.authorization_url,
        reference,
      });
    }

    const book = await prisma.book.findFirst({ where: { id: itemId, isActive: true } });
    if (!book) return badRequest("That e-book is no longer available.", 404);

    const owned = await hasPaidBook(user.id, book.id);
    if (owned) {
      return NextResponse.json({ alreadyOwned: true, redirectUrl: `/books/${book.slug}` });
    }

    const reference = `kbe_bk_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
    await prisma.bookPurchase.create({
      data: {
        userId: user.id,
        bookId: book.id,
        amountKobo: book.priceKobo,
        paystackRef: reference,
      },
    });

    const result = await initializePayment({
      email: user.email,
      amountKobo: book.priceKobo,
      reference,
      callbackUrl: absoluteUrl("/api/paystack/callback"),
      metadata: { kind: "book", bookId: book.id, userId: user.id },
    });

    if (!result.ok) {
      await prisma.bookPurchase.updateMany({
        where: { paystackRef: reference },
        data: { status: "FAILED" },
      });
      return badRequest(result.message, 502);
    }

    return NextResponse.json({
      authorizationUrl: result.data.authorization_url,
      reference,
    });
  } catch {
    return serverError("Could not start that payment.");
  }
}
