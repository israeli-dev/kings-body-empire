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

      const owned = await hasPaidPackage(user.id, pkg.id);
      if (owned) {
        return NextResponse.json({ alreadyOwned: true, redirectUrl: "/dashboard" });
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
        amountKobo: pkg.priceKobo,
        reference,
        callbackUrl: absoluteUrl("/api/paystack/callback"),
        metadata: { kind: "package", packageId: pkg.id, userId: user.id },
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
