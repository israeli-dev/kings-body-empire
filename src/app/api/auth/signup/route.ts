import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { badRequest, readJson, serverError } from "@/lib/api";
import { parseEmail, parseText } from "@/lib/validation";
import { passwordProblem } from "@/lib/password-reset";
import { attributeReferral, ensureReferralCode } from "@/lib/referrals";
import { REFERRAL_COOKIE, normaliseReferralCode } from "@/lib/referrals-core";
import { classifyDatabaseError } from "@/lib/health";

export async function POST(req: Request) {
  const body = await readJson(req);
  if (!body) return badRequest("Send a JSON body with name, email and password.");

  const name = parseText(body.name, { min: 2, max: 80 });
  const email = parseEmail(body.email);
  const password = parseText(body.password, { min: 8, max: 200 });

  if (!name) return badRequest("Please enter your name (at least 2 characters).");
  if (!email) return badRequest("That email address does not look valid.");
  if (!password) return badRequest("Password must be at least 8 characters.");

  const weak = passwordProblem(password);
  if (weak) return badRequest(weak);

  // Any database failure below used to surface as "Could not create your
  // account", which hides whether the email is taken or the deployment is
  // misconfigured. Classify it and say something actionable.
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return badRequest("An account with that email already exists.", 409);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
      select: { id: true, email: true, name: true },
    });

    // Referral attribution never fails a signup: an unknown or stale code is
    // simply ignored, and the new client still gets their own code to share.
    let referral: { attributed: boolean; referrerName?: string } = { attributed: false };
    try {
      const cookieCode = cookies().get(REFERRAL_COOKIE)?.value;
      const bodyCode = normaliseReferralCode(body.referralCode);
      referral = await attributeReferral({
        userId: user.id,
        rawCode: cookieCode ?? bodyCode,
      });
      await ensureReferralCode(user.id);
    } catch (error) {
      console.error("[signup] referral attribution failed:", error);
    }

    return NextResponse.json({ ...user, referral }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const diagnosis = classifyDatabaseError(message);

    if (diagnosis.problem !== "unknown") {
      // Log the real error for the operator, return a safe explanation.
      console.error("[signup] database problem:", diagnosis.problem, message);
      return NextResponse.json(
        {
          error:
            "Accounts cannot be created right now — the server cannot reach its database. Please try again shortly or contact support.",
          reason: diagnosis.problem,
        },
        { status: 503 },
      );
    }

    console.error("[signup] failed:", message);
    return serverError("Could not create your account. Please try again.");
  }
}
