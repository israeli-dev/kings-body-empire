import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/env";
import { readJson, serverError } from "@/lib/api";
import { parseEmail } from "@/lib/validation";
import { clientKey, rateLimit, sweepRateLimits } from "@/lib/rate-limit";
import { passwordResetEmail, sendMail } from "@/lib/mailer";
import {
  RESET_REQUEST_COOLDOWN_MS,
  RESET_TOKEN_TTL_MS,
  generateResetToken,
  hashResetToken,
  resetTokenExpiry,
} from "@/lib/password-reset";

export const dynamic = "force-dynamic";

/** Same answer whatever happens, so the endpoint cannot be used to probe which emails exist. */
const GENERIC_MESSAGE =
  "If an account exists for that email, we've sent a password reset link.";

export async function POST(req: Request) {
  sweepRateLimits();

  // 5 reset requests per IP per 15 minutes.
  const limited = rateLimit(clientKey(req, "forgot-password"), 5, 15 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${limited.retryAfterSeconds} seconds.` },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } },
    );
  }

  const body = await readJson(req);
  const email = parseEmail(body?.email);

  // Invalid email → still 200 with the generic message (no information leak),
  // just without doing any work.
  if (!email) return NextResponse.json({ message: GENERIC_MESSAGE });

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true },
    });

    if (!user) return NextResponse.json({ message: GENERIC_MESSAGE });

    // Quietly skip if a link was issued seconds ago (prevents mail bombing).
    const recent = await prisma.passwordResetToken.findFirst({
      where: { userId: user.id, createdAt: { gte: new Date(Date.now() - RESET_REQUEST_COOLDOWN_MS) } },
      select: { id: true },
    });
    if (recent) return NextResponse.json({ message: GENERIC_MESSAGE });

    // Only the newest link should work: drop any outstanding ones.
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    });

    const token = generateResetToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashResetToken(token),
        expiresAt: resetTokenExpiry(),
      },
    });

    const link = absoluteUrl(`/reset-password/${token}`);
    const mail = passwordResetEmail(link, Math.round(RESET_TOKEN_TTL_MS / 60000));
    const result = await sendMail({ ...mail, to: user.email });

    if (!result.ok) {
      // Do not fail the request: the user is told to check their inbox, and the
      // operator sees the provider error in the logs.
      console.error("[forgot-password] email could not be sent:", result.error);
    }

    return NextResponse.json({ message: GENERIC_MESSAGE });
  } catch (error) {
    console.error("[forgot-password] failed:", error);
    return serverError("Could not start a password reset. Please try again.");
  }
}
