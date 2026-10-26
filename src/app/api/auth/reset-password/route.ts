import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { badRequest, readJson, serverError } from "@/lib/api";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import {
  hashResetToken,
  isWellFormedResetToken,
  passwordProblem,
  resetTokenState,
} from "@/lib/password-reset";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // 10 attempts per IP per 15 minutes (a 256-bit token will not be guessed, but
  // this keeps the endpoint from being hammered).
  const limited = rateLimit(clientKey(req, "reset-password"), 10, 15 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${limited.retryAfterSeconds} seconds.` },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } },
    );
  }

  const body = await readJson(req);
  if (!body) return badRequest("Send a JSON body with a token and a new password.");

  const token = body.token;
  const password = body.password;

  if (!isWellFormedResetToken(token)) {
    return badRequest("That reset link is not valid. Request a new one.", 400);
  }

  const problem = passwordProblem(password);
  if (problem || typeof password !== "string") {
    return badRequest(problem ?? "Password must be at least 8 characters.", 400);
  }

  try {
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashResetToken(token) },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        usedAt: true,
        user: { select: { email: true } },
      },
    });

    if (!record) {
      return badRequest("That reset link is invalid or has already been used.", 400);
    }

    const state = resetTokenState(record);
    if (state === "used") {
      return badRequest("That reset link has already been used. Request a new one.", 400);
    }
    if (state === "expired") {
      return badRequest("That reset link has expired. Request a new one.", 400);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date();

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      // Single use: burn this token…
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: now },
      }),
      // …and every other outstanding one for this account.
      prisma.passwordResetToken.deleteMany({
        where: { userId: record.userId, usedAt: null },
      }),
    ]);

    // The caller already holds the token, so returning the email is safe and
    // lets the page sign them straight in.
    return NextResponse.json({ ok: true, email: record.user.email });
  } catch (error) {
    console.error("[reset-password] failed:", error);
    return serverError("Could not reset that password. Please try again.");
  }
}
